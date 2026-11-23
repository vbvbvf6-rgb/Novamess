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

const router = Router();
const ADMIN_USER_IDS = [1, 4];
let profileGiftTableReady: Promise<void> | null = null;

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
         gi.name AS gift_name, gi.emoji AS gift_emoji, gi.image_url AS gift_image_url,
         gi.description AS gift_description, u.display_name AS sender_name
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
    const gifts = await db.select().from(giftItemsTable).orderBy(giftItemsTable.id);
    res.json(gifts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить подарки" });
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
    const owned = await db.execute(sql`SELECT 1 FROM gifts WHERE id = ${giftId} AND receiver_id = ${userId} LIMIT 1`);
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
    const senderId = req.currentUserId;
    const receiverId = Number(req.body?.receiverId);
    const giftItemId = Number(req.body?.giftItemId);
    const chatId = Number(req.body?.chatId);
    const note = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 280) : "";

    if (!Number.isInteger(receiverId) || receiverId <= 0 || receiverId === senderId) {
      return res.status(400).json({ error: "Укажите другого получателя" });
    }
    if (!Number.isInteger(giftItemId) || giftItemId <= 0) {
      return res.status(400).json({ error: "Выберите подарок" });
    }
    if (!Number.isInteger(chatId) || chatId <= 0) {
      return res.status(400).json({ error: "Для подарка нужен общий чат" });
    }

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

    const result = await db.transaction(async (tx) => {
      const giftRows = await tx.execute(sql`
        SELECT id, name, emoji, animation_type, rarity, stars, price, description, prime_only, image_url
        FROM gift_items WHERE id = ${giftItemId} FOR SHARE
      `);
      const item = giftRows.rows[0] as any;
      if (!item) throw Object.assign(new Error("Подарок не найден"), { status: 404 });

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
        isAnonymous: false,
        chatId,
      }).returning();

      const [message] = await tx.insert(messagesTable).values({
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
      },
      sender: sender ?? null,
      receiver: receiver ?? null,
    };
    const builtMessage = {
      ...result.message,
      sender: sender ?? null,
      reactions: [],
      replyTo: null,
      giftData,
      pollData: null,
    };

    res.status(201).json({ message: builtMessage, balance: result.balance, chatId });
    broadcastToChat(chatId, "new-message", { messageId: result.message.id, chatId });
    broadcastToUser(receiverId, "new-message", {
      messageId: result.message.id,
      chatId,
      senderName: sender?.displayName || sender?.username || "Пользователь",
      body: `🎁 Подарок: ${result.item.name}`,
      senderAvatar: sender?.avatarUrl || null,
    });
    broadcastToUser(senderId, "new-message", { messageId: result.message.id, chatId });
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
    const gifts = await db.select().from(giftItemsTable).orderBy(giftItemsTable.id);
    res.json(gifts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить каталог" });
  }
});

router.patch("/admin/gifts/:giftId", async (req, res) => {
  try {
    if (!(await isAdmin(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const giftId = Number(req.params.giftId);
    const price = Number(req.body?.price);
    if (!Number.isInteger(giftId) || giftId <= 0 || !Number.isInteger(price) || price < 0 || price > 1_000_000) {
      return res.status(400).json({ error: "Укажите цену от 0 до 1 000 000 искр" });
    }
    const [gift] = await db.update(giftItemsTable)
      .set({ price })
      .where(eq(giftItemsTable.id, giftId))
      .returning();
    if (!gift) return res.status(404).json({ error: "Подарок не найден" });
    res.json(gift);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось сохранить цену" });
  }
});

export default router;
