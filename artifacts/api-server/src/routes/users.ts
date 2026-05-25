import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, like, or, sql } from "drizzle-orm";
import { UpdateMeBody } from "@workspace/api-zod";

const router = Router();

router.get("/users/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const rows = await db.execute(sql`SELECT balance, username_changed_at, has_prime, prime_tier, prime_expires_at, age_verified, is_admin, is_bot FROM users WHERE id = ${uid}`);
    const row = rows.rows[0] as any;
    const balance = row ? Number(row.balance) : 0;
    const hasPrime = row?.has_prime === true || row?.has_prime === "t" || row?.has_prime === 1;
    const primeTier: string | null = row?.prime_tier ?? null;
    const ageVerified = row?.age_verified === true || row?.age_verified === "t" || row?.age_verified === 1;
    const isAdmin = row?.is_admin === true || row?.is_admin === "t" || row?.is_admin === 1;
    const isBot = row?.is_bot === true || row?.is_bot === "t" || row?.is_bot === 1;
    const popularityRow = await db.execute(sql`
      SELECT COALESCE(SUM(gi.price), 0)::int AS popularity
      FROM gifts g
      JOIN gift_items gi ON gi.id = g.gift_item_id
      WHERE g.receiver_id = ${uid} AND g.is_anonymous = false
    `);
    const popularity = Number((popularityRow.rows[0] as any)?.popularity || 0);
    res.json({ ...user, balance, hasPrime, primeTier, primeExpiresAt: row?.prime_expires_at ?? null, usernameChangedAt: row?.username_changed_at ?? null, ageVerified, isAdmin, isBot, popularity });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = UpdateMeBody.parse(req.body);
    const [updated] = await db.update(usersTable).set(body).where(eq(usersTable.id, uid)).returning();
    const rows = await db.execute(sql`SELECT balance, username_changed_at, has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const row = rows.rows[0] as any;
    const balance = row ? Number(row.balance) : 0;
    const hasPrime = row?.has_prime === true || row?.has_prime === "t" || row?.has_prime === 1;
    const primeTier: string | null = row?.prime_tier ?? null;
    res.json({ ...updated, balance, hasPrime, primeTier, primeExpiresAt: row?.prime_expires_at ?? null, usernameChangedAt: row?.username_changed_at ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me/username", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Укажите новый никнейм" });
    }
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 32) {
      return res.status(400).json({ error: "Никнейм должен быть от 3 до 32 символов" });
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      return res.status(400).json({ error: "Только латинские буквы, цифры и _" });
    }

    const rows = await db.execute(sql`SELECT username, username_changed_at, has_prime FROM users WHERE id = ${uid}`);
    const current = rows.rows[0] as any;
    if (!current) return res.status(404).json({ error: "Пользователь не найден" });

    if (current.username === trimmed) {
      return res.status(400).json({ error: "Это уже ваш никнейм" });
    }

    const hasPrime = current.has_prime === true || current.has_prime === "t";
    const cooldownDays = hasPrime ? 1 : 7;

    if (current.username_changed_at) {
      const lastChange = new Date(current.username_changed_at);
      const diffMs = Date.now() - lastChange.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < cooldownDays) {
        const daysLeft = Math.ceil(cooldownDays - diffDays);
        const nextDate = new Date(lastChange.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
        const label = hasPrime
          ? `Prime-привилегия: смена раз в 24ч. Следующая доступна через ${Math.ceil((cooldownDays - diffDays) * 24)} ч.`
          : `Следующая смена никнейма доступна через ${daysLeft} ${daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}`;
        return res.status(429).json({
          error: label,
          nextAvailableAt: nextDate.toISOString(),
          daysLeft,
        });
      }
    }

    const existing = await db.execute(sql`SELECT id FROM users WHERE username = ${trimmed} AND id != ${uid}`);
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Этот никнейм уже занят" });
    }

    await db.execute(sql`UPDATE users SET username = ${trimmed}, username_changed_at = NOW() WHERE id = ${uid}`);
    const updated = await db.execute(sql`SELECT username, username_changed_at FROM users WHERE id = ${uid}`);
    const u = updated.rows[0] as any;
    res.json({ username: u.username, usernameChangedAt: u.username_changed_at });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    const users = await db.select().from(usersTable).where(
      or(
        like(usersTable.username, `%${q}%`),
        like(usersTable.displayName, `%${q}%`)
      )
    ).limit(20);
    res.json(users);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId", async (req, res) => {
  try {
    const requesterId = req.currentUserId;
    const userId = Number(req.params.userId);
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const popularityRow = await db.execute(sql`
      SELECT COALESCE(SUM(gi.price), 0)::int AS popularity
      FROM gifts g
      JOIN gift_items gi ON gi.id = g.gift_item_id
      WHERE g.receiver_id = ${userId} AND g.is_anonymous = false
    `);
    const popularity = Number((popularityRow.rows[0] as any)?.popularity || 0);
    if (userId !== requesterId && !(user as any).showOnlineStatus) {
      return res.json({ ...user, status: "offline", lastSeen: null, popularity });
    }
    res.json({ ...user, popularity });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { messagesTable, callsTable, giftsTable, chatMembersTable, contactsTable } = await import("@workspace/db");
    const { count, sum } = await import("drizzle-orm");

    const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.senderId, uid));
    const [callCount] = await db.select({ count: count() }).from(callsTable).where(eq(callsTable.callerId, uid));
    const [callDuration] = await db.select({ total: sum(callsTable.durationSeconds) }).from(callsTable).where(eq(callsTable.callerId, uid));
    const [giftsSent] = await db.select({ count: count() }).from(giftsTable).where(eq(giftsTable.senderId, uid));
    const [giftsReceived] = await db.select({ count: count() }).from(giftsTable).where(eq(giftsTable.receiverId, uid));
    const [chatsCount] = await db.select({ count: count() }).from(chatMembersTable).where(eq(chatMembersTable.userId, uid));
    const [contactsCount] = await db.select({ count: count() }).from(contactsTable).where(eq(contactsTable.userId, uid));

    const balanceRow = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((balanceRow.rows[0] as any)?.balance ?? 0);

    res.json({
      messagesSent: Number(msgCount?.count ?? 0),
      callsMade: Number(callCount?.count ?? 0),
      callDurationSeconds: Number(callDuration?.total ?? 0),
      giftsSent: Number(giftsSent?.count ?? 0),
      giftsReceived: Number(giftsReceived?.count ?? 0),
      chatsCount: Number(chatsCount?.count ?? 0),
      contactsCount: Number(contactsCount?.count ?? 0),
      popularity: Math.min(balance, 10000),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Gift Showcase: top rarest unique gifts received by a user (public)
router.get("/users/:userId/gift-showcase", async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (!targetId) return res.status(400).json({ error: "Invalid userId" });

    const rows = await db.execute(sql`
      SELECT
        gi.id,
        gi.name,
        gi.emoji,
        gi.rarity,
        gi.animation_type,
        gi.stars,
        COUNT(g.id)::int AS count
      FROM gifts g
      JOIN gift_items gi ON gi.id = g.gift_item_id
      WHERE g.receiver_id = ${targetId}
        AND g.is_anonymous = false
      GROUP BY gi.id, gi.name, gi.emoji, gi.rarity, gi.animation_type, gi.stars
      ORDER BY
        CASE gi.rarity
          WHEN 'cosmic'    THEN 1
          WHEN 'legendary' THEN 2
          WHEN 'epic'      THEN 3
          WHEN 'rare'      THEN 4
          ELSE 5
        END ASC,
        gi.stars DESC,
        count DESC
      LIMIT 8
    `);

    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Report a user
router.post("/users/:userId/report", async (req, res) => {
  try {
    const reporterId = (req as any).userId;
    if (!reporterId) return res.status(401).json({ error: "Unauthorized" });
    const targetId = Number(req.params.userId);
    if (!targetId || targetId === reporterId) return res.status(400).json({ error: "Invalid userId" });
    const { reason, details } = req.body as { reason: string; details?: string };
    if (!reason) return res.status(400).json({ error: "Reason is required" });
    await db.execute(sql`
      INSERT INTO user_reports (reporter_id, target_id, reason, details, created_at)
      VALUES (${reporterId}, ${targetId}, ${reason}, ${details ?? null}, NOW())
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Public leaderboard (/api/leaderboard?sort=balance|messages) ── */
router.get("/leaderboard", async (req, res) => {
  try {
    const sort = (req.query.sort as string) || "balance";
    let rows;
    if (sort === "messages") {
      rows = await db.execute(sql`
        SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url,
               u.has_prime, u.prime_tier, u.is_verified,
               COUNT(m.id)::int AS messages_sent
        FROM users u
        LEFT JOIN messages m ON m.sender_id = u.id AND m.is_deleted = false
        WHERE u.is_bot = false
        GROUP BY u.id
        ORDER BY messages_sent DESC
        LIMIT 20
      `);
    } else {
      rows = await db.execute(sql`
        SELECT id, username, display_name, avatar_color, avatar_url,
               has_prime, prime_tier, is_verified, balance
        FROM users
        WHERE is_bot = false
        ORDER BY balance DESC
        LIMIT 20
      `);
    }
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
