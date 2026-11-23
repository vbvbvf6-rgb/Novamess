import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { broadcastToUser } from "../lib/sse";

const router = Router();

const PRIME_PLANS: Record<string, { spark: number; months: number }> = {
  monthly:  { spark: 499,  months: 1  },
  halfyear: { spark: 1974, months: 6  },
  yearly:   { spark: 2988, months: 12 },
};

const PLUS_PLANS: Record<string, { spark: number; months: number }> = {
  monthly:  { spark: 899,  months: 1  },
  halfyear: { spark: 3594, months: 6  },
  yearly:   { spark: 5388, months: 12 },
};

async function ensurePrimePlusLounge(userId: number): Promise<number | null> {
  try {
    // Find the Prime+ Lounge (a special group chat)
    const existing = await db.execute(sql`
      SELECT c.id FROM chats c
      WHERE c.type = 'group' AND c.name = 'Prime+ Lounge'
      LIMIT 1
    `);

    let loungeId: number;

    if ((existing.rows as any[]).length > 0) {
      loungeId = (existing.rows[0] as any).id;
    } else {
      // Create the Prime+ Lounge
      const created = await db.execute(sql`
        INSERT INTO chats (type, name, description, avatar_color)
        VALUES ('group', 'Prime+ Lounge', 'Эксклюзивный чат для участников Prime+', '#7c3aed')
        RETURNING id
      `);
      loungeId = (created.rows[0] as any).id;

      // Add a system message
      await db.execute(sql`
        INSERT INTO messages (chat_id, sender_id, text, type)
        SELECT ${loungeId}, id, '💎 Добро пожаловать в Prime+ Lounge — эксклюзивное сообщество подписчиков Prime+! Здесь вы можете общаться с другими Prime+ участниками.', 'text'
        FROM users WHERE is_admin = true LIMIT 1
      `).catch(async () => {
        // If no admin, use first prime+ user
        await db.execute(sql`
          INSERT INTO messages (chat_id, sender_id, text, type)
          VALUES (${loungeId}, ${userId}, '💎 Добро пожаловать в Prime+ Lounge!', 'text')
        `).catch(() => {});
      });
    }

    // Check if user is already a member
    const isMember = await db.execute(sql`
      SELECT 1 FROM chat_members WHERE chat_id = ${loungeId} AND user_id = ${userId} LIMIT 1
    `);

    if ((isMember.rows as any[]).length === 0) {
      await db.execute(sql`
        INSERT INTO chat_members (chat_id, user_id, role) VALUES (${loungeId}, ${userId}, 'member')
      `);
    }

    return loungeId;
  } catch (err) {
    console.error("Failed to ensure Prime+ Lounge:", err);
    return null;
  }
}

router.post("/prime/subscribe", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { planId, tier } = req.body;
    const isPlus = tier === "prime_plus";
    const plans = isPlus ? PLUS_PLANS : PRIME_PLANS;
    const plan = plans[planId];
    if (!plan) {
      return res.status(400).json({ error: "Неверный план подписки" });
    }

    const rows = await db.execute(sql`SELECT balance, has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const balance = Number(user.balance ?? 0);
    const now = new Date();
    const currentExpiry = user.prime_expires_at ? new Date(user.prime_expires_at) : now;
    const base = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + plan.months);

    const tierValue = isPlus ? "prime_plus" : "prime";

    // Atomic deduct — prevents race where two concurrent subscribe requests drain balance twice
    const deductResult = await db.execute(
      sql`UPDATE users
          SET balance = balance - ${plan.spark},
              has_prime = true,
              prime_tier = ${tierValue},
              prime_expires_at = ${newExpiry.toISOString()}
          WHERE id = ${uid} AND balance >= ${plan.spark}
          RETURNING balance`
    );
    if ((deductResult.rows as any[]).length === 0) {
      return res.status(400).json({
        error: `Недостаточно Nova. Нужно ${plan.spark} ✦, у вас ${balance} ✦`,
        required: plan.spark,
        balance,
      });
    }

    const currentTier = user.prime_tier;
    const hadPrime = user.has_prime === true || user.has_prime === "t" || user.has_prime === 1;
    const isUpgrade = hadPrime && currentTier !== tierValue;
    const isFirstTime = !hadPrime;
    const SIGNUP_BONUS = isFirstTime || isUpgrade ? (isPlus ? 100 : 50) : 0;
    if (SIGNUP_BONUS > 0) {
      await db.execute(sql`UPDATE users SET balance = balance + ${SIGNUP_BONUS} WHERE id = ${uid}`);
      await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'subscription_bonus', ${SIGNUP_BONUS}, ${'Бонус при подписке: ' + tierValue})`).catch(() => {});
    }

    // Log subscription activity
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'subscription', ${-plan.spark}, ${'Подписка: ' + tierValue + ' ' + planId})`).catch(() => {});

    const updated = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((updated.rows[0] as any)?.balance ?? 0);

    // If subscribing to Prime+, add to lounge
    let loungeId: number | null = null;
    if (isPlus) {
      loungeId = await ensurePrimePlusLounge(uid);
    }

    res.json({
      success: true,
      balance: newBalance,
      primeExpiresAt: newExpiry.toISOString(),
      primeTier: tierValue,
      bonusAwarded: SIGNUP_BONUS,
      loungeId,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/prime/status", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const hasPrime = user.has_prime === true || user.has_prime === "t";
    const expiresAt = user.prime_expires_at ?? null;
    const isActive = hasPrime && expiresAt && new Date(expiresAt) > new Date();

    if (hasPrime && expiresAt && !isActive) {
      await db.execute(sql`UPDATE users SET has_prime = false, prime_tier = null WHERE id = ${uid}`);
    }

    res.json({ hasPrime: isActive, primeTier: user.prime_tier ?? null, primeExpiresAt: expiresAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Get or create Prime+ Lounge
router.get("/prime/lounge", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = primeRow.rows[0] as any;
    const hasPrime = (user?.has_prime === true || user?.has_prime === "t") && user?.prime_expires_at && new Date(user.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && user?.prime_tier === "prime_plus";

    if (!isPrimePlus) return res.status(403).json({ error: "Prime+ Lounge доступен только для Prime+ подписчиков" });

    const loungeId = await ensurePrimePlusLounge(uid);
    if (!loungeId) return res.status(500).json({ error: "Не удалось найти Prime+ Lounge" });

    res.json({ loungeId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/prime/gift", async (req, res) => {
  try {
    const senderId = req.currentUserId;
    const { planId, recipientId, tier } = req.body;
    if (tier !== "prime" && tier !== "prime_plus") {
      return res.status(400).json({ error: "Выберите Prime или Prime+" });
    }
    const isPlus = tier === "prime_plus";
    const plans = isPlus ? PLUS_PLANS : PRIME_PLANS;
    const plan = plans[planId];
    if (!plan) return res.status(400).json({ error: "Неверный план подписки" });
    const targetId = Number(recipientId);
    if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ error: "Укажите получателя" });
    if (targetId === senderId) return res.status(400).json({ error: "Нельзя подарить подписку самому себе" });

    const tierValue = isPlus ? "prime_plus" : "prime";
    const cost = plan.spark;
    const result = await db.transaction(async tx => {
      const accountRows = await tx.execute(sql`
        SELECT id, balance, has_prime, prime_tier, prime_expires_at
        FROM users
        WHERE id IN (${senderId}, ${targetId})
        ORDER BY id
        FOR UPDATE
      `);
      const accounts = accountRows.rows as any[];
      const sender = accounts.find(account => Number(account.id) === senderId);
      const recipient = accounts.find(account => Number(account.id) === targetId);
      if (!sender) throw Object.assign(new Error("Пользователь не найден"), { status: 404 });
      if (!recipient) throw Object.assign(new Error("Получатель не найден"), { status: 404 });

      const senderBalance = Number(sender.balance ?? 0);
      if (senderBalance < cost) {
        throw Object.assign(new Error(`Недостаточно Nova ✦. Нужно ${cost}, у вас ${senderBalance} ✦`), { status: 402 });
      }

      const now = new Date();
      const currentExpiry = recipient.prime_expires_at ? new Date(recipient.prime_expires_at) : now;
      const hasActivePrime = currentExpiry > now;
      const base = hasActivePrime ? currentExpiry : now;
      const newExpiry = new Date(base);
      newExpiry.setMonth(newExpiry.getMonth() + plan.months);
      const recipientTier = hasActivePrime && recipient.prime_tier === "prime_plus" && !isPlus
        ? "prime_plus"
        : tierValue;

      await tx.execute(sql`UPDATE users SET balance = balance - ${cost} WHERE id = ${senderId}`);
      await tx.execute(sql`
        UPDATE users
        SET has_prime = true, prime_tier = ${recipientTier}, prime_expires_at = ${newExpiry.toISOString()}
        WHERE id = ${targetId}
      `);
      await tx.execute(sql`
        INSERT INTO spark_activity (user_id, type, amount, description)
        VALUES (${senderId}, 'spent', ${-cost}, ${`Подарок подписки ${recipientTier}: ${planId}`})
      `);

      return {
        balance: senderBalance - cost,
        primeExpiresAt: newExpiry.toISOString(),
        primeTier: recipientTier,
      };
    });

    // If gifting Prime+, add recipient to lounge
    if (result.primeTier === "prime_plus") {
      await ensurePrimePlusLounge(targetId);
    }

    res.json({ success: true, balance: result.balance, primeExpiresAt: result.primeExpiresAt, primeTier: result.primeTier });
    broadcastToUser(targetId, "prime-update", { userId: targetId, hasPrime: true, primeTier: result.primeTier, primeExpiresAt: result.primeExpiresAt });
  } catch (err: any) {
    req.log.error(err);
    const status = Number(err?.status) || 500;
    res.status(status).json({ error: status < 500 ? err.message : "Ошибка сервера" });
  }
});

router.post("/prime/cancel", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT has_prime FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (!user.has_prime) return res.status(400).json({ error: "У вас нет активной подписки" });
    await db.execute(sql`UPDATE users SET has_prime = false, prime_tier = NULL, prime_expires_at = NULL WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'subscription_cancel', 0, 'Отмена подписки Prime')`).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
