import { Router } from "express";
import { db, giftsTable, giftItemsTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { SendGiftBody } from "@workspace/api-zod";

const router = Router();

async function buildGift(gift: typeof giftsTable.$inferSelect) {
  const giftItem = await db.query.giftItemsTable.findFirst({ where: eq(giftItemsTable.id, gift.giftItemId) });
  const sender = gift.isAnonymous ? null : await db.query.usersTable.findFirst({ where: eq(usersTable.id, gift.senderId) });
  const receiver = await db.query.usersTable.findFirst({ where: eq(usersTable.id, gift.receiverId) });
  return { ...gift, giftItem, sender, receiver };
}

router.get("/gifts", async (req, res) => {
  try {
    const items = await db.select().from(giftItemsTable);
    const counts = await db.execute(sql`
      SELECT gift_item_id, LEAST(COUNT(*)::int, 10000) AS times_given
      FROM gifts
      GROUP BY gift_item_id
    `);
    const countMap = new Map(counts.rows.map((r: any) => [Number(r.gift_item_id), Number(r.times_given)]));
    const itemsWithPopularity = items.map(item => ({
      ...item,
      timesGiven: countMap.get(item.id) ?? 0,
    }));
    res.json(itemsWithPopularity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gifts/sent", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const gifts = await db.select().from(giftsTable)
      .where(eq(giftsTable.senderId, uid))
      .orderBy(desc(giftsTable.createdAt));
    const built = await Promise.all(gifts.map(buildGift));
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gifts/received", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const gifts = await db.select().from(giftsTable)
      .where(eq(giftsTable.receiverId, uid))
      .orderBy(desc(giftsTable.createdAt));
    const built = await Promise.all(gifts.map(buildGift));
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gifts/top-senders/:userId", async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (!targetId || isNaN(targetId)) return res.status(400).json({ error: "Неверный userId" });

    const rows = await db.execute(sql`
      SELECT
        g.sender_id                           AS "senderId",
        u.username                            AS "username",
        u.display_name                        AS "displayName",
        u.avatar_color                        AS "avatarColor",
        u.has_prime                           AS "hasPrime",
        u.prime_tier                          AS "primeTier",
        COUNT(g.id)::int                      AS "giftCount",
        COALESCE(SUM(gi.stars), 0)::int       AS "totalStars",
        COALESCE(SUM(gi.price), 0)::int       AS "totalValue",
        MAX(g.created_at)                     AS "lastGiftAt"
      FROM gifts g
      JOIN users u ON u.id = g.sender_id
      JOIN gift_items gi ON gi.id = g.gift_item_id
      WHERE g.receiver_id = ${targetId}
        AND g.is_anonymous = false
      GROUP BY g.sender_id, u.username, u.display_name, u.avatar_color, u.has_prime, u.prime_tier
      ORDER BY "totalValue" DESC, "giftCount" DESC
      LIMIT 10
    `);

    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/gifts/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await db.execute(sql`
      SELECT
        u.id                                    AS "userId",
        u.username                              AS "username",
        u.display_name                          AS "displayName",
        u.avatar_color                          AS "avatarColor",
        u.avatar_url                            AS "avatarUrl",
        u.has_prime                             AS "hasPrime",
        u.prime_tier                            AS "primeTier",
        u.is_verified                           AS "isVerified",
        COUNT(g.id)::int                        AS "giftCount",
        COALESCE(SUM(gi.stars), 0)::int         AS "totalStars",
        COALESCE(SUM(gi.price), 0)::int         AS "totalValue",
        MAX(g.created_at)                       AS "lastGiftAt"
      FROM gifts g
      JOIN users u ON u.id = g.receiver_id
      JOIN gift_items gi ON gi.id = g.gift_item_id
      WHERE u.is_bot = false
      GROUP BY u.id, u.username, u.display_name, u.avatar_color, u.avatar_url,
               u.has_prime, u.prime_tier, u.is_verified
      ORDER BY "totalValue" DESC, "giftCount" DESC
      LIMIT ${limit}
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/gifts/send", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = SendGiftBody.parse(req.body);

    const giftItem = await db.query.giftItemsTable.findFirst({
      where: eq(giftItemsTable.id, body.giftItemId),
    });
    if (!giftItem) {
      return res.status(404).json({ error: "Подарок не найден" });
    }

    if ((giftItem as any).primeOnly) {
      const primeRow = await db.execute(sql`SELECT has_prime, prime_expires_at FROM users WHERE id = ${uid}`);
      const pu = primeRow.rows[0] as any;
      const hasPrime = (pu?.has_prime === true || pu?.has_prime === "t") && pu?.prime_expires_at && new Date(pu.prime_expires_at) > new Date();
      if (!hasPrime) {
        return res.status(403).json({ error: "Этот подарок доступен только для Pulse Prime участников" });
      }
    }

    const price = (giftItem as any).price ?? 0;

    if (price > 0) {
      // Atomic deduct — prevents race conditions where two gift sends could drain below zero
      const deductResult = await db.execute(
        sql`UPDATE users SET balance = balance - ${price} WHERE id = ${uid} AND balance >= ${price} RETURNING balance`
      );
      if ((deductResult.rows as any[]).length === 0) {
        const balanceRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
        const balance = Number((balanceRows.rows[0] as any)?.balance ?? 0);
        return res.status(400).json({
          error: `Недостаточно Кристаллов. Нужно ${price} 💎, у вас ${balance} 💎`,
          required: price,
          balance,
        });
      }
    }

    const [gift] = await db.insert(giftsTable).values({
      giftItemId: body.giftItemId,
      senderId: uid,
      receiverId: body.receiverId,
      message: body.message,
      isAnonymous: body.isAnonymous ?? false,
      chatId: body.chatId,
    }).returning();

    const built = await buildGift(gift);
    res.status(201).json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
