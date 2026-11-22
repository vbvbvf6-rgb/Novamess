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
