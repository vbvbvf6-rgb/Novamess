import { Router } from "express";
import {
  db,
  giftItemsTable,
  giftsTable,
  messagesTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { broadcastToChat, broadcastToUser } from "../lib/sse";
import { isGiftSendingEnabled } from "../lib/giftFeature";

const router = Router();
const ADMIN_USER_IDS = [1, 4];
const GIFT_RARITIES = new Set(["common", "rare", "epic", "legendary", "cosmic"]);
const GIFT_ANIMATIONS = new Set([
  "bounce", "sparkle", "hearts", "confetti", "roses", "fireworks", "orbit", "bloom",
  "stars", "balloons", "diamonds", "flame", "galaxy", "lightning", "magic", "supernova", "vortex",
]);
let profileGiftTableReady: Promise<void> | null = null;

function catalogGift(row: any) {
  const soldCount = Number(row.sold_count ?? 0);
  const maxSupply = row.max_supply === null || row.max_supply === undefined ? null : Number(row.max_supply);
  return {
    id: Number(row.id),
    name: row.name,
    emoji: row.emoji,
    animationType: row.animation_type,
    rarity: row.rarity,
    stars: Number(row.stars),
    price: Number(row.price),
    description: row.description ?? "",
    primeOnly: Boolean(row.prime_only),
    imageUrl: row.image_url ?? null,
    isCollectible: Boolean(row.is_collectible),
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    maxSupply,
    exchangeValue: Number(row.exchange_value ?? 0),
    upgradePrice: Number(row.upgrade_price ?? 0),
    soldCount,
    availableCount: maxSupply === null ? null : Math.max(0, maxSupply - soldCount),
  };
}

async function listGiftCatalog(includeInactive = false) {
  const rows = await db.execute(sql`
    SELECT gi.*, COUNT(g.id)::int AS sold_count
    FROM gift_items gi
    LEFT JOIN gifts g ON g.gift_item_id = gi.id
    WHERE ${includeInactive} OR gi.is_active = TRUE
    GROUP BY gi.id
    ORDER BY gi.id
  `);
  return (rows.rows as any[]).map(catalogGift);
}

function parseGiftInput(body: any, partial = false) {
  const value: Record<string, unknown> = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body ?? {}, key);
  const stringField = (key: string, column: string, maxLength: number, required = false) => {
    if (partial && !has(key)) return;
    const raw = body?.[key];
    const text = typeof raw === "string" ? raw.trim() : "";
    if ((required && !text) || text.length > maxLength) throw new Error(`Проверьте поле «${key}»`);
    value[column] = text;
  };
  const integerField = (
    key: string,
    column: string,
    min: number,
    max: number,
    nullable = false,
    defaultValue?: number | null,
  ) => {
    if (partial && !has(key)) return;
    const raw = body?.[key];
    if (!partial && raw === undefined && defaultValue !== undefined) {
      value[column] = defaultValue;
      return;
    }
    if (nullable && (raw === null || raw === "")) {
      value[column] = null;
      return;
    }
    const number = Number(raw);
    if (!Number.isInteger(number) || number < min || number > max) throw new Error(`Некорректное значение поля «${key}»`);
    value[column] = number;
  };

  stringField("name", "name", 80, !partial);
  stringField("emoji", "emoji", 32, !partial);
  stringField("description", "description", 280);

  if (!partial || has("animationType")) {
    const animationType = String(body?.animationType || "sparkle");
    if (!GIFT_ANIMATIONS.has(animationType)) throw new Error("Выберите анимацию из списка");
    value.animationType = animationType;
  }
  if (!partial || has("rarity")) {
    const rarity = String(body?.rarity || "common");
    if (!GIFT_RARITIES.has(rarity)) throw new Error("Выберите редкость из списка");
    value.rarity = rarity;
  }
  integerField("stars", "stars", 1, 1_000_000, false, 1);
  integerField("price", "price", 0, 10_000_000, false, 100);
  integerField("maxSupply", "maxSupply", 1, 10_000_000, true, null);
  integerField("exchangeValue", "exchangeValue", 0, 10_000_000, false, 0);
  integerField("upgradePrice", "upgradePrice", 0, 10_000_000, false, 0);

  if (!partial || has("primeOnly")) {
    if (typeof body?.primeOnly !== "boolean" && !partial) throw new Error("Укажите доступность подарка Prime");
    value.primeOnly = body?.primeOnly === true;
  }
  if (!partial || has("isCollectible")) {
    if (typeof body?.isCollectible !== "boolean" && !partial) throw new Error("Укажите, является ли подарок коллекционным");
    value.isCollectible = body?.isCollectible === true;
  }
  if (!partial || has("isActive")) {
    if (typeof body?.isActive !== "boolean" && !partial) value.isActive = true;
    else value.isActive = body?.isActive === true;
  }
  if (!partial || has("imageUrl")) {
    const raw = body?.imageUrl;
    if (raw === undefined && partial) {
      // Leave omitted image URLs unchanged for partial updates.
    } else if (raw === undefined || raw === null || raw === "") {
      value.imageUrl = null;
    } else if (typeof raw === "string" && raw.length <= 2048 && (raw.startsWith("/") && !raw.startsWith("//"))) {
      value.imageUrl = raw;
    } else if (typeof raw === "string" && raw.length <= 2048) {
      let parsed: URL;
      try { parsed = new URL(raw); } catch { throw new Error("Укажите корректный URL изображения"); }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Разрешены только HTTP(S)-ссылки на изображение");
      value.imageUrl = raw;
    } else {
      throw new Error("Укажите корректный URL изображения");
    }
  }

  return value;
}

function giftInstance(row: any, viewerId: number) {
  const isReceived = Number(row.receiver_id) === viewerId;
  const anonymous = Boolean(row.is_anonymous) && isReceived;
  return {
    id: Number(row.id),
    giftItemId: Number(row.gift_item_id),
    senderId: anonymous ? null : Number(row.sender_id),
    senderName: anonymous ? "Анонимный пользователь" : row.sender_name || "Пользователь",
    receiverId: Number(row.receiver_id),
    receiverName: row.receiver_name || "Пользователь",
    message: row.message,
    isAnonymous: Boolean(row.is_anonymous),
    chatId: row.chat_id === null ? null : Number(row.chat_id),
    createdAt: row.created_at,
    inventoryStatus: row.inventory_status,
    isUpgraded: Boolean(row.is_upgraded),
    serialNumber: row.serial_number === null ? null : Number(row.serial_number),
    giftItem: catalogGift({ ...row, id: row.gift_item_id, sold_count: row.sold_count }),
  };
}

async function getGiftInstance(giftId: number, viewerId: number) {
  const rows = await db.execute(sql`
    SELECT g.id, g.gift_item_id, g.sender_id, g.receiver_id, g.message, g.is_anonymous, g.chat_id,
           g.created_at, g.inventory_status, g.is_upgraded, g.serial_number,
           gi.name, gi.emoji, gi.animation_type, gi.rarity, gi.stars, gi.price, gi.description,
           gi.prime_only, gi.image_url, gi.is_collectible, gi.is_active, gi.max_supply,
           gi.exchange_value, gi.upgrade_price,
           COUNT(all_gifts.id)::int AS sold_count,
           sender.display_name AS sender_name,
           receiver.display_name AS receiver_name
    FROM gifts g
    JOIN gift_items gi ON gi.id = g.gift_item_id
    LEFT JOIN gifts all_gifts ON all_gifts.gift_item_id = gi.id
    LEFT JOIN users sender ON sender.id = g.sender_id
    LEFT JOIN users receiver ON receiver.id = g.receiver_id
    WHERE g.id = ${giftId}
    GROUP BY g.id, gi.id, sender.id, receiver.id
    LIMIT 1
  `);
  const row = (rows.rows as any[])[0];
  return row ? giftInstance(row, viewerId) : null;
}

function ensureProfileGiftTable() {
  if (!profileGiftTableReady) {
    profileGiftTableReady = db.execute(sql`
      CREATE TABLE IF NOT EXISTS profile_pinned_gifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gift_id INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
        pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, gift_id)
      )
    `).then(() => undefined);
  }
  return profileGiftTableReady;
}

const profileGiftSelect = sql`
  SELECT g.id, g.sender_id, g.receiver_id, g.message, g.is_anonymous, g.created_at,
         g.inventory_status, g.is_upgraded, g.serial_number,
         gi.name AS gift_name, gi.emoji AS gift_emoji, gi.image_url AS gift_image_url,
         gi.description AS gift_description, gi.is_collectible, gi.max_supply,
         gi.exchange_value, gi.upgrade_price, u.display_name AS sender_name
  FROM gifts g
  JOIN gift_items gi ON gi.id = g.gift_item_id
  LEFT JOIN users u ON u.id = g.sender_id
`;

function formatProfileGift(row: any, isPinned = false) {
  return {
    id: Number(row.id),
    senderId: row.is_anonymous ? null : Number(row.sender_id),
    senderName: row.is_anonymous ? "Анонимно" : row.sender_name || "Пользователь",
    message: row.message,
    createdAt: row.created_at,
    name: row.gift_name,
    emoji: row.gift_emoji,
    imageUrl: row.gift_image_url,
    description: row.gift_description,
    isPinned,
    isCollectible: Boolean(row.is_collectible),
    maxSupply: row.max_supply === null ? null : Number(row.max_supply),
    exchangeValue: Number(row.exchange_value ?? 0),
    upgradePrice: Number(row.upgrade_price ?? 0),
    inventoryStatus: row.inventory_status,
    isUpgraded: Boolean(row.is_upgraded),
    serialNumber: row.serial_number === null ? null : Number(row.serial_number),
  };
}

async function isAdmin(userId: number): Promise<boolean> {
  if (ADMIN_USER_IDS.includes(userId)) return true;
  const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`);
  const value = (rows.rows[0] as { is_admin?: boolean | string } | undefined)?.is_admin;
  return value === true || value === "t";
}

router.get("/gifts", async (req, res) => {
  try {
    if (!(await isGiftSendingEnabled())) return res.json([]);
    res.json(await listGiftCatalog());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить подарки" });
  }
});

router.get("/gifts/mine", async (req, res) => {
  try {
    const userId = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT g.id, g.gift_item_id, g.sender_id, g.receiver_id, g.message, g.is_anonymous, g.chat_id,
             g.created_at, g.inventory_status, g.is_upgraded, g.serial_number,
             gi.name, gi.emoji, gi.animation_type, gi.rarity, gi.stars, gi.price, gi.description,
             gi.prime_only, gi.image_url, gi.is_collectible, gi.is_active, gi.max_supply, gi.exchange_value, gi.upgrade_price,
             COUNT(all_gifts.id)::int AS sold_count,
             sender.display_name AS sender_name,
             receiver.display_name AS receiver_name
      FROM gifts g
      JOIN gift_items gi ON gi.id = g.gift_item_id
      LEFT JOIN gifts all_gifts ON all_gifts.gift_item_id = gi.id
      LEFT JOIN users sender ON sender.id = g.sender_id
      LEFT JOIN users receiver ON receiver.id = g.receiver_id
      WHERE g.receiver_id = ${userId} OR g.sender_id = ${userId}
      GROUP BY g.id, gi.id, sender.id, receiver.id
      ORDER BY g.created_at DESC
      LIMIT 250
    `);
    const all = (rows.rows as any[]).map(row => giftInstance(row, userId));
    res.json({
      received: all.filter(item => item.receiverId === userId),
      sent: all.filter(item => item.senderId === userId),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить ваши подарки" });
  }
});

router.get("/gifts/sent", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT g.id, g.gift_item_id, g.sender_id, g.receiver_id, g.message, g.is_anonymous, g.chat_id,
             g.created_at, g.inventory_status, g.is_upgraded, g.serial_number,
             gi.name, gi.emoji, gi.animation_type, gi.rarity, gi.stars, gi.price, gi.description,
             gi.prime_only, gi.image_url, gi.is_collectible, gi.is_active, gi.max_supply,
             gi.exchange_value, gi.upgrade_price,
             COUNT(all_gifts.id)::int AS sold_count,
             sender.display_name AS sender_name,
             receiver.display_name AS receiver_name
      FROM gifts g
      JOIN gift_items gi ON gi.id = g.gift_item_id
      LEFT JOIN gifts all_gifts ON all_gifts.gift_item_id = gi.id
      LEFT JOIN users sender ON sender.id = g.sender_id
      LEFT JOIN users receiver ON receiver.id = g.receiver_id
      WHERE g.sender_id = ${req.currentUserId}
      GROUP BY g.id, gi.id, sender.id, receiver.id
      ORDER BY g.created_at DESC
      LIMIT 250
    `);
    res.json((rows.rows as any[]).map(row => giftInstance(row, req.currentUserId)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить отправленные подарки" });
  }
});

router.get("/gifts/received", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT g.id, g.gift_item_id, g.sender_id, g.receiver_id, g.message, g.is_anonymous, g.chat_id,
             g.created_at, g.inventory_status, g.is_upgraded, g.serial_number,
             gi.name, gi.emoji, gi.animation_type, gi.rarity, gi.stars, gi.price, gi.description,
             gi.prime_only, gi.image_url, gi.is_collectible, gi.is_active, gi.max_supply,
             gi.exchange_value, gi.upgrade_price,
             COUNT(all_gifts.id)::int AS sold_count,
             sender.display_name AS sender_name,
             receiver.display_name AS receiver_name
      FROM gifts g
      JOIN gift_items gi ON gi.id = g.gift_item_id
      LEFT JOIN gifts all_gifts ON all_gifts.gift_item_id = gi.id
      LEFT JOIN users sender ON sender.id = g.sender_id
      LEFT JOIN users receiver ON receiver.id = g.receiver_id
      WHERE g.receiver_id = ${req.currentUserId}
      GROUP BY g.id, gi.id, sender.id, receiver.id
      ORDER BY g.created_at DESC
      LIMIT 250
    `);
    res.json((rows.rows as any[]).map(row => giftInstance(row, req.currentUserId)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить полученные подарки" });
  }
});

router.post("/gifts/:giftId/open", async (req, res) => {
  try {
    const userId = req.currentUserId;
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });
    const updated = await db.execute(sql`
      UPDATE gifts SET inventory_status = 'collected'
      WHERE id = ${giftId} AND receiver_id = ${userId} AND inventory_status = 'received'
      RETURNING id
    `);
    if (!updated.rows.length) {
      const existing = await db.execute(sql`
        SELECT inventory_status FROM gifts WHERE id = ${giftId} AND receiver_id = ${userId} LIMIT 1
      `);
      if (!existing.rows.length) return res.status(404).json({ error: "Подарок не найден в вашей коллекции" });
      if ((existing.rows[0] as any).inventory_status === "exchanged") {
        return res.status(409).json({ error: "Этот подарок уже обменян" });
      }
    }
    const gift = await getGiftInstance(giftId, userId);
    if (!gift) return res.status(404).json({ error: "Подарок не найден" });
    res.json(gift);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось открыть подарок" });
  }
});

router.post("/gifts/:giftId/upgrade", async (req, res) => {
  try {
    const userId = req.currentUserId;
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });

    await db.transaction(async tx => {
      const rows = await tx.execute(sql`
        SELECT g.inventory_status, g.is_upgraded, gi.is_collectible, gi.upgrade_price, gi.name
        FROM gifts g JOIN gift_items gi ON gi.id = g.gift_item_id
        WHERE g.id = ${giftId} AND g.receiver_id = ${userId}
        FOR UPDATE OF g
      `);
      const gift = rows.rows[0] as any;
      if (!gift) throw Object.assign(new Error("Подарок не найден в вашей коллекции"), { status: 404 });
      if (gift.inventory_status === "exchanged") throw Object.assign(new Error("Этот подарок уже обменян"), { status: 409 });
      if (!gift.is_collectible) throw Object.assign(new Error("Этот подарок нельзя улучшить"), { status: 400 });
      if (gift.is_upgraded) throw Object.assign(new Error("Этот подарок уже улучшен"), { status: 409 });

      const cost = Number(gift.upgrade_price ?? 0);
      const charged = await tx.execute(sql`
        UPDATE users SET balance = COALESCE(balance, 0) - ${cost}
        WHERE id = ${userId} AND COALESCE(balance, 0) >= ${cost}
        RETURNING balance
      `);
      if (!charged.rows.length) throw Object.assign(new Error("Недостаточно искр для улучшения"), { status: 402 });
      await tx.execute(sql`
        UPDATE gifts SET is_upgraded = TRUE, inventory_status = 'collected'
        WHERE id = ${giftId} AND receiver_id = ${userId}
      `);
      await tx.execute(sql`
        INSERT INTO spark_activity (user_id, type, amount, description)
        VALUES (${userId}, 'spent', ${-cost}, ${`Улучшение подарка: ${gift.name}`})
      `).catch(() => {});
    });

    const gift = await getGiftInstance(giftId, userId);
    if (!gift) return res.status(404).json({ error: "Подарок не найден" });
    res.json(gift);
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    if (status < 500) return res.status(status).json({ error: err.message });
    req.log.error(err);
    res.status(500).json({ error: "Не удалось улучшить подарок" });
  }
});

router.post("/gifts/:giftId/exchange", async (req, res) => {
  try {
    const userId = req.currentUserId;
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });
    let balance = 0;

    await db.transaction(async tx => {
      const rows = await tx.execute(sql`
        SELECT g.inventory_status, gi.exchange_value, gi.name
        FROM gifts g JOIN gift_items gi ON gi.id = g.gift_item_id
        WHERE g.id = ${giftId} AND g.receiver_id = ${userId}
        FOR UPDATE OF g
      `);
      const gift = rows.rows[0] as any;
      if (!gift) throw Object.assign(new Error("Подарок не найден в вашей коллекции"), { status: 404 });
      if (gift.inventory_status === "exchanged") throw Object.assign(new Error("Этот подарок уже обменян"), { status: 409 });
      if (gift.inventory_status !== "collected") throw Object.assign(new Error("Сначала откройте подарок"), { status: 409 });
      const value = Number(gift.exchange_value ?? 0);
      if (value <= 0) throw Object.assign(new Error("Этот подарок нельзя обменять"), { status: 400 });
      const credited = await tx.execute(sql`
        UPDATE users SET balance = COALESCE(balance, 0) + ${value}
        WHERE id = ${userId}
        RETURNING balance
      `);
      if (!credited.rows.length) throw Object.assign(new Error("Пользователь не найден"), { status: 404 });
      balance = Number((credited.rows[0] as any).balance);
      const exchanged = await tx.execute(sql`
        UPDATE gifts SET inventory_status = 'exchanged'
        WHERE id = ${giftId} AND receiver_id = ${userId} AND inventory_status = 'collected'
        RETURNING id
      `);
      if (!exchanged.rows.length) throw Object.assign(new Error("Подарок уже обменян"), { status: 409 });
      await tx.execute(sql`
        INSERT INTO spark_activity (user_id, type, amount, description)
        VALUES (${userId}, 'earned', ${value}, ${`Обмен подарка: ${gift.name}`})
      `).catch(() => {});
    });

    const gift = await getGiftInstance(giftId, userId);
    if (!gift) return res.status(404).json({ error: "Подарок не найден" });
    res.json({ gift, balance });
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    if (status < 500) return res.status(status).json({ error: err.message });
    req.log.error(err);
    res.status(500).json({ error: "Не удалось обменять подарок" });
  }
});

router.get("/users/:userId/profile-gifts", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Некорректный профиль" });
    await ensureProfileGiftTable();

    const pinnedRows = await db.execute(sql`
      ${profileGiftSelect}
      JOIN profile_pinned_gifts pg ON pg.gift_id = g.id
      WHERE pg.user_id = ${userId} AND g.receiver_id = ${userId}
      ORDER BY pg.pinned_at DESC
      LIMIT 12
    `);
    const pinned = (pinnedRows.rows as any[]).map(row => formatProfileGift(row, true));
    const received = userId === req.currentUserId
      ? await db.execute(sql`
          ${profileGiftSelect}
          WHERE g.receiver_id = ${userId}
          ORDER BY g.created_at DESC
          LIMIT 100
        `)
      : null;

    res.json({
      pinned,
      received: (received?.rows as any[] | undefined)?.map(row => formatProfileGift(row, pinned.some(item => item.id === Number(row.id)))) ?? [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить подарки профиля" });
  }
});

router.post("/users/me/profile-gifts/:giftId/pin", async (req, res) => {
  try {
    const userId = req.currentUserId;
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });
    await ensureProfileGiftTable();
    const owned = await db.execute(sql`SELECT 1 FROM gifts WHERE id = ${giftId} AND receiver_id = ${userId} AND inventory_status <> 'exchanged' LIMIT 1`);
    if (!owned.rows.length) return res.status(404).json({ error: "Полученный подарок не найден" });

    const countRows = await db.execute(sql`SELECT COUNT(*)::int AS count FROM profile_pinned_gifts WHERE user_id = ${userId}`);
    if (Number((countRows.rows[0] as any)?.count ?? 0) >= 12) {
      const existing = await db.execute(sql`SELECT 1 FROM profile_pinned_gifts WHERE user_id = ${userId} AND gift_id = ${giftId} LIMIT 1`);
      if (!existing.rows.length) return res.status(400).json({ error: "Можно закрепить не больше 12 подарков" });
    }

    await db.execute(sql`
      INSERT INTO profile_pinned_gifts (user_id, gift_id)
      VALUES (${userId}, ${giftId})
      ON CONFLICT (user_id, gift_id) DO NOTHING
    `);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось закрепить подарок" });
  }
});

router.delete("/users/me/profile-gifts/:giftId/pin", async (req, res) => {
  try {
    const userId = req.currentUserId;
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });
    await ensureProfileGiftTable();
    await db.execute(sql`DELETE FROM profile_pinned_gifts WHERE user_id = ${userId} AND gift_id = ${giftId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось убрать подарок из профиля" });
  }
});

router.post("/gifts/send", async (req, res) => {
  try {
    if (!(await isGiftSendingEnabled())) {
      return res.status(403).json({ error: "Отправка подарков временно отключена администрацией" });
    }
    const senderId = req.currentUserId;
    const receiverId = Number(req.body?.receiverId);
    const giftItemId = Number(req.body?.giftItemId);
    const rawChatId = req.body?.chatId;
    const chatId = rawChatId === undefined || rawChatId === null || rawChatId === "" ? null : Number(rawChatId);
    const note = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 280) : "";
    const isAnonymous = req.body?.isAnonymous === true;

    if (!Number.isInteger(receiverId) || receiverId <= 0 || receiverId === senderId) {
      return res.status(400).json({ error: "Укажите другого получателя" });
    }
    if (!Number.isInteger(giftItemId) || giftItemId <= 0) {
      return res.status(400).json({ error: "Выберите подарок" });
    }
    if (chatId !== null && (!Number.isInteger(chatId) || chatId <= 0)) {
      return res.status(400).json({ error: "Некорректный чат" });
    }

    if (chatId !== null) {
      const sharedChat = await db.execute(sql`
        SELECT c.type
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id
        WHERE c.id = ${chatId} AND cm.user_id IN (${senderId}, ${receiverId})
        GROUP BY c.id, c.type
        HAVING COUNT(DISTINCT cm.user_id) = 2
        LIMIT 1
      `);
      if (!sharedChat.rows.length) {
        return res.status(403).json({ error: "У вас нет общего чата с получателем" });
      }
    }

    const result = await db.transaction(async (tx) => {
      const giftRows = await tx.execute(sql`
        SELECT id, name, emoji, animation_type, rarity, stars, price, description, prime_only,
               image_url, is_collectible, is_active, max_supply, exchange_value, upgrade_price
        FROM gift_items WHERE id = ${giftItemId} FOR UPDATE
      `);
      const item = giftRows.rows[0] as any;
      if (!item) throw Object.assign(new Error("Подарок не найден"), { status: 404 });
      if (!item.is_active) throw Object.assign(new Error("Этот подарок сейчас недоступен"), { status: 409 });

      const soldRows = await tx.execute(sql`
        SELECT COUNT(*)::int AS count FROM gifts WHERE gift_item_id = ${giftItemId}
      `);
      const soldCount = Number((soldRows.rows[0] as any)?.count ?? 0);
      const maxSupply = item.max_supply === null ? null : Number(item.max_supply);
      if (maxSupply !== null && soldCount >= maxSupply) {
        throw Object.assign(new Error("Этот ограниченный подарок уже закончился"), { status: 409 });
      }

      const charged = await tx.execute(sql`
        UPDATE users SET balance = COALESCE(balance, 0) - ${Number(item.price)}
        WHERE id = ${senderId} AND COALESCE(balance, 0) >= ${Number(item.price)}
        RETURNING balance
      `);
      if (!charged.rows.length) {
        const current = await tx.execute(sql`SELECT COALESCE(balance, 0) AS balance FROM users WHERE id = ${senderId}`);
        throw Object.assign(
          new Error(`Недостаточно искр. Ваш баланс: ${Number((current.rows[0] as any)?.balance ?? 0)} ✦`),
          { status: 402 },
        );
      }

      const [gift] = await tx.insert(giftsTable).values({
        giftItemId,
        senderId,
        receiverId,
        message: note || null,
        isAnonymous,
        chatId,
        serialNumber: item.is_collectible ? soldCount + 1 : null,
      }).returning();

      const [message] = chatId === null ? [null] : await tx.insert(messagesTable).values({
        chatId,
        senderId,
        text: note || null,
        type: "gift",
        mediaUrl: `gift:${gift.id}`,
      }).returning();

      return {
        gift,
        message,
        item,
        soldCount: soldCount + 1,
        balance: Number((charged.rows[0] as any).balance),
      };
    });

    const [sender, receiver] = await Promise.all([
      db.query.usersTable.findFirst({ where: eq(usersTable.id, senderId) }),
      db.query.usersTable.findFirst({ where: eq(usersTable.id, receiverId) }),
    ]);
    const giftData = {
      ...result.gift,
      giftItem: {
        id: Number(result.item.id),
        name: result.item.name,
        emoji: result.item.emoji,
        animationType: result.item.animation_type,
        rarity: result.item.rarity,
        stars: Number(result.item.stars),
        price: Number(result.item.price),
        description: result.item.description,
        imageUrl: result.item.image_url,
        primeOnly: Boolean(result.item.prime_only),
        isCollectible: Boolean(result.item.is_collectible),
        isActive: Boolean(result.item.is_active),
        maxSupply: result.item.max_supply === null ? null : Number(result.item.max_supply),
        exchangeValue: Number(result.item.exchange_value ?? 0),
        upgradePrice: Number(result.item.upgrade_price ?? 0),
        soldCount: result.soldCount,
        availableCount: result.item.max_supply === null ? null : Math.max(0, Number(result.item.max_supply) - result.soldCount),
      },
      sender: sender ?? null,
      receiver: receiver ?? null,
    };
    const gift = await getGiftInstance(result.gift.id, senderId);
    if (!gift) return res.status(404).json({ error: "Отправленный подарок не найден" });
    const builtMessage = result.message ? {
      ...result.message,
      sender: sender ?? null,
      reactions: [],
      replyTo: null,
      giftData,
      pollData: null,
    } : null;

    res.status(201).json({ gift, message: builtMessage, balance: result.balance, chatId });
    if (result.message && chatId !== null) {
      broadcastToChat(chatId, "new-message", { messageId: result.message.id, chatId });
      broadcastToUser(receiverId, "new-message", {
        messageId: result.message.id,
        chatId,
        senderName: isAnonymous ? "Анонимный пользователь" : sender?.displayName || sender?.username || "Пользователь",
        body: `🎁 Подарок: ${result.item.name}`,
        senderAvatar: isAnonymous ? null : sender?.avatarUrl || null,
      });
      broadcastToUser(senderId, "new-message", { messageId: result.message.id, chatId });
    } else {
      broadcastToUser(receiverId, "gift-received", {
        giftId: result.gift.id,
        giftName: result.item.name,
        isAnonymous,
        senderName: isAnonymous ? null : sender?.displayName || sender?.username || "Пользователь",
      });
    }
    db.execute(sql`
      INSERT INTO spark_activity (user_id, type, amount, description)
      VALUES (${senderId}, 'spent', ${-Number(result.item.price)}, ${`Подарок: ${result.item.name}`})
    `).catch(() => {});
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    if (status < 500) return res.status(status).json({ error: err.message });
    req.log.error(err);
    res.status(500).json({ error: "Не удалось отправить подарок" });
  }
});

router.get("/admin/gifts", async (req, res) => {
  try {
    if (!(await isAdmin(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    res.json(await listGiftCatalog(true));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить каталог" });
  }
});

router.post("/admin/gifts", async (req, res) => {
  try {
    if (!(await isAdmin(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    let values: Record<string, unknown>;
    try {
      values = parseGiftInput(req.body);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Проверьте параметры подарка" });
    }
    const [gift] = await db.insert(giftItemsTable).values(values as any).returning();
    if (!gift) return res.status(500).json({ error: "Не удалось создать подарок" });
    res.status(201).json(catalogGift(gift));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Подарок с таким названием уже есть" });
    req.log.error(err);
    res.status(500).json({ error: "Не удалось создать подарок" });
  }
});

router.patch("/admin/gifts/:giftId", async (req, res) => {
  try {
    if (!(await isAdmin(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });
    let values: Record<string, unknown>;
    try {
      values = parseGiftInput(req.body, true);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Проверьте параметры подарка" });
    }
    if (Object.keys(values).length === 0) return res.status(400).json({ error: "Укажите поля для изменения" });
    const [gift] = await db.update(giftItemsTable)
      .set(values as any)
      .where(eq(giftItemsTable.id, giftId))
      .returning();
    if (!gift) return res.status(404).json({ error: "Подарок не найден" });
    const catalog = await db.execute(sql`
      SELECT gi.*, COUNT(g.id)::int AS sold_count
      FROM gift_items gi LEFT JOIN gifts g ON g.gift_item_id = gi.id
      WHERE gi.id = ${giftId}
      GROUP BY gi.id
    `);
    res.json(catalogGift(catalog.rows[0] ?? gift));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "Подарок с таким названием уже есть" });
    req.log.error(err);
    res.status(500).json({ error: "Не удалось сохранить подарок" });
  }
});

router.delete("/admin/gifts/:giftId", async (req, res) => {
  try {
    if (!(await isAdmin(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const giftId = Number(req.params.giftId);
    if (!Number.isInteger(giftId) || giftId <= 0) return res.status(400).json({ error: "Некорректный подарок" });
    const [gift] = await db.update(giftItemsTable)
      .set({ isActive: false })
      .where(eq(giftItemsTable.id, giftId))
      .returning({ id: giftItemsTable.id });
    if (!gift) return res.status(404).json({ error: "Подарок не найден" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось скрыть подарок" });
  }
});

export default router;
