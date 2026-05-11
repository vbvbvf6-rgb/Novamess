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
    res.json({ ...user, balance, hasPrime, primeTier, primeExpiresAt: row?.prime_expires_at ?? null, usernameChangedAt: row?.username_changed_at ?? null, ageVerified, isAdmin, isBot });
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
    const rows = await db.execute(sql`SELECT balance, username_changed_at, has_prime, prime_expires_at FROM users WHERE id = ${uid}`);
    const row = rows.rows[0] as any;
    const balance = row ? Number(row.balance) : 0;
    const hasPrime = row?.has_prime === true || row?.has_prime === "t" || row?.has_prime === 1;
    res.json({ ...updated, balance, hasPrime, primeExpiresAt: row?.prime_expires_at ?? null, usernameChangedAt: row?.username_changed_at ?? null });
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
    if (userId !== requesterId && !(user as any).showOnlineStatus) {
      return res.json({ ...user, status: "offline", lastSeen: null });
    }
    res.json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/wallet", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = rows.rows[0] ? Number((rows.rows[0] as any).balance) : 0;
    const address = `PULSE-${uid.toString().padStart(6, "0")}`;
    res.json({ balance, address, currency: "SPARK", symbol: "⚡" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/wallet/earn", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${uid}`);
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any).balance);
    res.json({ balance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/wallet/spend", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any).balance);
    if (balance < amount) {
      return res.status(400).json({ error: "Недостаточно средств", balance });
    }
    await db.execute(sql`UPDATE users SET balance = balance - ${amount} WHERE id = ${uid}`);
    const result = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((result.rows[0] as any).balance);
    res.json({ balance: newBalance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/prime/subscribe", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { planId, tier } = req.body;
    const primeTier: string = tier === "prime_plus" ? "prime_plus" : "prime";

    const PLAN_COSTS: Record<string, Record<string, { cost: number; months: number }>> = {
      prime: {
        monthly:  { cost: 499,  months: 1  },
        halfyear: { cost: 1974, months: 6  },
        yearly:   { cost: 2988, months: 12 },
      },
      prime_plus: {
        monthly:  { cost: 899,  months: 1  },
        halfyear: { cost: 3594, months: 6  },
        yearly:   { cost: 5388, months: 12 },
      },
    };

    const plan = PLAN_COSTS[primeTier]?.[planId];
    if (!plan) return res.status(400).json({ error: "Неверный план" });

    const rows = await db.execute(sql`SELECT balance, has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const balance = Number(user.balance ?? 0);
    if (balance < plan.cost) {
      return res.status(400).json({ error: `Недостаточно Spark. Нужно ${plan.cost} ⚡, у вас ${balance} ⚡.`, balance });
    }

    const now = new Date();
    let expiresAt: Date;
    if (user.has_prime && user.prime_expires_at && new Date(user.prime_expires_at) > now) {
      expiresAt = new Date(user.prime_expires_at);
    } else {
      expiresAt = new Date(now);
    }
    expiresAt.setMonth(expiresAt.getMonth() + plan.months);

    const bonusSpark = primeTier === "prime_plus" ? 100 : 50;

    await db.execute(
      sql`UPDATE users SET balance = balance - ${plan.cost} + ${bonusSpark}, has_prime = true, prime_tier = ${primeTier}, prime_expires_at = ${expiresAt.toISOString()} WHERE id = ${uid}`
    );

    const updated = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((updated.rows[0] as any).balance ?? 0);

    res.json({ success: true, hasPrime: true, primeTier, primeExpiresAt: expiresAt.toISOString(), balance: newBalance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/prime/cancel", async (req, res) => {
  try {
    const uid = req.currentUserId;
    await db.execute(sql`UPDATE users SET has_prime = false, prime_expires_at = NULL WHERE id = ${uid}`);
    res.json({ success: true });
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

    res.json({
      messagesSent: Number(msgCount?.count ?? 0),
      callsMade: Number(callCount?.count ?? 0),
      callDurationSeconds: Number(callDuration?.total ?? 0),
      giftsSent: Number(giftsSent?.count ?? 0),
      giftsReceived: Number(giftsReceived?.count ?? 0),
      chatsCount: Number(chatsCount?.count ?? 0),
      contactsCount: Number(contactsCount?.count ?? 0),
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

export default router;
