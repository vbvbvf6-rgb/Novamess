import { Router } from "express";
import { db, usersTable, giftsTable, giftItemsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/wallet", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    const address = `PULSE-${uid.toString().padStart(6, "0")}`;
    res.json({ balance, address });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/earn", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0 || amount > 1000) {
      return res.status(400).json({ error: "Некорректная сумма" });
    }
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'earned', ${amount}, 'Заработано') ON CONFLICT DO NOTHING`).catch(() => {});
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/spend", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Некорректная сумма" });
    }
    // Atomic deduct — only succeeds if balance >= amount, prevents race conditions
    const result = await db.execute(sql`
      UPDATE users SET balance = balance - ${amount}
      WHERE id = ${uid} AND balance >= ${amount}
      RETURNING balance
    `);
    if ((result.rows as any[]).length === 0) {
      const balanceRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
      const balance = Number((balanceRows.rows[0] as any)?.balance ?? 0);
      return res.status(400).json({ error: `Недостаточно Кристаллов. Ваш баланс: ${balance} 💎`, balance });
    }
    const newBalance = Number((result.rows[0] as any)?.balance ?? 0);
    db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'spent', ${-amount}, 'Покупка') ON CONFLICT DO NOTHING`).catch(() => {});
    res.json({ success: true, balance: newBalance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/send", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { address, amount } = req.body;
    if (!address || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Укажите адрес и сумму" });
    }
    const trimmed = String(address).trim().toUpperCase();
    if (!trimmed.startsWith("PULSE-")) {
      return res.status(400).json({ error: "Неверный формат. Адрес должен начинаться с PULSE-" });
    }
    const targetId = parseInt(trimmed.replace("PULSE-", ""), 10);
    if (isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "Неверный адрес кошелька" });
    }
    if (targetId === uid) {
      return res.status(400).json({ error: "Нельзя отправить самому себе" });
    }

    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) {
      return res.status(404).json({ error: "Пользователь с таким адресом не найден" });
    }

    // Use a single atomic SQL statement to deduct from sender and credit receiver,
    // and verify sender has sufficient balance — prevents race conditions.
    const result = await db.execute(sql`
      WITH deducted AS (
        UPDATE users SET balance = balance - ${amount}
        WHERE id = ${uid} AND balance >= ${amount}
        RETURNING balance
      ), credited AS (
        UPDATE users SET balance = balance + ${amount}
        WHERE id = ${targetId} AND EXISTS (SELECT 1 FROM deducted)
        RETURNING balance
      )
      SELECT (SELECT balance FROM deducted) AS new_sender_balance,
             (SELECT COUNT(*) FROM deducted) AS deduct_count
    `);

    const row = result.rows[0] as any;
    if (!row || Number(row.deduct_count) === 0) {
      // Re-fetch actual balance for accurate error message
      const senderRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
      const senderBalance = Number((senderRows.rows[0] as any)?.balance ?? 0);
      return res.status(400).json({ error: `Недостаточно Кристаллов. Ваш баланс: ${senderBalance} 💎` });
    }

    const newBalance = Number(row.new_sender_balance ?? 0);

    // Log activity (best-effort, non-blocking)
    db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'sent', ${-amount}, ${'Отправлено: ' + target.displayName})`).catch(() => {});
    db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${targetId}, 'received', ${amount}, ${'Получено от пользователя'})`).catch(() => {});

    res.json({ success: true, balance: newBalance, recipient: target.displayName, amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/daily-bonus", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const today = new Date().toISOString().slice(0, 10);
    const claimed = await db.execute(
      sql`SELECT 1 FROM user_daily_bonus WHERE user_id = ${uid} AND bonus_date = ${today} LIMIT 1`
    );
    if ((claimed.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Бонус уже получен сегодня. Возвращайся завтра!" });
    }
    const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const row0 = primeRow.rows[0] as any;
    const hasPrime = (row0?.has_prime === true || row0?.has_prime === "t") && row0?.prime_expires_at && new Date(row0.prime_expires_at) > new Date();
    const primeTier = row0?.prime_tier ?? null;
    const BONUS = hasPrime ? (primeTier === "prime_plus" ? 50 : 25) : 10;
    await db.execute(sql`INSERT INTO user_daily_bonus (user_id, bonus_date) VALUES (${uid}, ${today}) ON CONFLICT DO NOTHING`);
    await db.execute(sql`UPDATE users SET balance = balance + ${BONUS} WHERE id = ${uid}`);

    // Log spark activity
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'daily_bonus', ${BONUS}, 'Ежедневный бонус') `).catch(() => {});

    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance, bonus: BONUS, isPrime: hasPrime });
  } catch (err: any) {
    if (String(err?.message).includes("user_daily_bonus")) {
      return res.status(500).json({ error: "Таблица бонусов не создана. Свяжитесь с администратором." });
    }
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/buy", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount, packageLabel, priceLabel } = req.body;
    if (!amount || typeof amount !== "number" || amount <= 0 || !packageLabel || !priceLabel) {
      return res.status(400).json({ error: "Некорректные данные" });
    }
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'purchase', ${amount}, ${'Пополнение: ' + packageLabel})`).catch(() => {});
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    await db.execute(
      sql`INSERT INTO topup_requests (user_id, amount, package_label, price_label, status) VALUES (${uid}, ${amount}, ${packageLabel}, ${priceLabel}, 'completed')`
    ).catch(() => {});
    res.json({ success: true, balance, amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Monthly epic gift for Prime+ users
router.post("/wallet/monthly-gift", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at, last_monthly_gift_at FROM users WHERE id = ${uid}`);
    const user = primeRow.rows[0] as any;

    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const hasPrime = (user.has_prime === true || user.has_prime === "t") && user.prime_expires_at && new Date(user.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && user.prime_tier === "prime_plus";

    if (!isPrimePlus) return res.status(403).json({ error: "Ежемесячный подарок доступен только для Prime+" });

    // Check 30-day cooldown
    if (user.last_monthly_gift_at) {
      const lastGift = new Date(user.last_monthly_gift_at);
      const daysSinceLast = (Date.now() - lastGift.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast < 30) {
        const daysLeft = Math.ceil(30 - daysSinceLast);
        return res.status(409).json({ error: `Следующий подарок через ${daysLeft} дн.`, daysLeft });
      }
    }

    // Find an epic gift item to award
    let epicGiftItem: any = null;
    try {
      const epicItems = await db.execute(sql`SELECT * FROM gift_items WHERE rarity = 'epic' ORDER BY RANDOM() LIMIT 1`);
      epicGiftItem = epicItems.rows[0] as any;
    } catch {}

    if (!epicGiftItem) {
      // Fallback: award spark instead
      const sparkReward = 200;
      await db.execute(sql`UPDATE users SET balance = balance + ${sparkReward}, last_monthly_gift_at = NOW() WHERE id = ${uid}`);
      await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'monthly_gift', ${sparkReward}, 'Ежемесячный подарок Prime+')`).catch(() => {});
      const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
      return res.json({ success: true, type: "spark", amount: sparkReward, balance: Number((rows.rows[0] as any)?.balance ?? 0) });
    }

    // Award the gift to self
    await db.execute(sql`
      INSERT INTO gifts (gift_item_id, sender_id, receiver_id, message)
      VALUES (${epicGiftItem.id}, ${uid}, ${uid}, 'Ежемесячный подарок Prime+ 🎁')
    `).catch(() => {});

    await db.execute(sql`UPDATE users SET last_monthly_gift_at = NOW() WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'monthly_gift', 0, ${'Ежемесячный эпический подарок: ' + epicGiftItem.name})`).catch(() => {});

    res.json({ success: true, type: "gift", gift: epicGiftItem });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Monthly gift status
router.get("/wallet/monthly-gift/status", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const row = await db.execute(sql`SELECT last_monthly_gift_at, has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = row.rows[0] as any;

    const hasPrime = (user?.has_prime === true || user?.has_prime === "t") && user?.prime_expires_at && new Date(user.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && user?.prime_tier === "prime_plus";

    if (!isPrimePlus) return res.json({ available: false, reason: "not_prime_plus" });

    const lastGiftAt = user?.last_monthly_gift_at ? new Date(user.last_monthly_gift_at) : null;
    const daysSinceLast = lastGiftAt ? (Date.now() - lastGiftAt.getTime()) / (1000 * 60 * 60 * 24) : 999;
    const available = daysSinceLast >= 30;
    const daysLeft = available ? 0 : Math.ceil(30 - daysSinceLast);

    res.json({ available, daysLeft, lastGiftAt: lastGiftAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Spark activity log (detailed stats for Prime+)
router.get("/wallet/activity", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    const rows = await db.execute(sql`
      SELECT * FROM spark_activity
      WHERE user_id = ${uid}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    const summary = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
        COUNT(*) as total_transactions
      FROM spark_activity
      WHERE user_id = ${uid}
    `);

    res.json({
      activities: rows.rows,
      summary: summary.rows[0] ?? { total_earned: 0, total_spent: 0, total_transactions: 0 },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ─── Spark Beg Requests ───────────────────────────────────────────────────────

router.post("/wallet/beg", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { toUserId, amount, message } = req.body;
    if (!toUserId || typeof toUserId !== "number") {
      return res.status(400).json({ error: "Укажите получателя" });
    }
    if (toUserId === uid) {
      return res.status(400).json({ error: "Нельзя попросить Кристаллы у самого себя" });
    }
    const amt = typeof amount === "number" && amount > 0 ? Math.floor(amount) : 0;
    const msg = typeof message === "string" ? message.trim().slice(0, 200) : "";

    const target = await db.execute(sql`SELECT id, display_name FROM users WHERE id = ${toUserId}`);
    if (!(target.rows as any[]).length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Check for existing pending request between same pair
    const existing = await db.execute(sql`
      SELECT id FROM spark_beg_requests
      WHERE from_user_id = ${uid} AND to_user_id = ${toUserId} AND status = 'pending'
      LIMIT 1
    `);
    if ((existing.rows as any[]).length) {
      return res.status(409).json({ error: "У вас уже есть активный запрос к этому пользователю" });
    }

    const inserted = await db.execute(sql`
      INSERT INTO spark_beg_requests (from_user_id, to_user_id, amount, message, status)
      VALUES (${uid}, ${toUserId}, ${amt}, ${msg}, 'pending')
      RETURNING id
    `);

    res.json({ success: true, id: (inserted.rows[0] as any).id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/wallet/beg/incoming", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT b.id, b.from_user_id, b.amount, b.message, b.status, b.created_at,
             u.display_name, u.username, u.avatar_color, u.avatar_url
      FROM spark_beg_requests b
      JOIN users u ON u.id = b.from_user_id
      WHERE b.to_user_id = ${uid} AND b.status = 'pending'
      ORDER BY b.created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/wallet/beg/outgoing", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT b.id, b.to_user_id, b.amount, b.message, b.status, b.created_at,
             u.display_name, u.username, u.avatar_color, u.avatar_url
      FROM spark_beg_requests b
      JOIN users u ON u.id = b.to_user_id
      WHERE b.from_user_id = ${uid}
      ORDER BY b.created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/beg/:id/fulfill", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const begId = parseInt(req.params.id, 10);
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Укажите сумму" });
    }

    const begRows = await db.execute(sql`
      SELECT * FROM spark_beg_requests WHERE id = ${begId} AND to_user_id = ${uid} AND status = 'pending' LIMIT 1
    `);
    if (!(begRows.rows as any[]).length) {
      return res.status(404).json({ error: "Запрос не найден" });
    }
    const beg = begRows.rows[0] as any;

    // Atomically deduct, credit and mark fulfilled in one transaction block
    await db.execute(sql`BEGIN`);
    try {
      const deductResult = await db.execute(sql`
        UPDATE users SET balance = balance - ${amount}
        WHERE id = ${uid} AND balance >= ${amount}
        RETURNING balance
      `);
      if ((deductResult.rows as any[]).length === 0) {
        await db.execute(sql`ROLLBACK`);
        const senderRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
        const senderBalance = Number((senderRows.rows[0] as any)?.balance ?? 0);
        return res.status(400).json({ error: `Недостаточно Кристаллов. Ваш баланс: ${senderBalance} 💎` });
      }
      const newBalance = Number((deductResult.rows[0] as any)?.balance ?? 0);
      await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${beg.from_user_id}`);
      await db.execute(sql`UPDATE spark_beg_requests SET status = 'fulfilled' WHERE id = ${begId}`);
      await db.execute(sql`COMMIT`);

      const fromUser = await db.execute(sql`SELECT display_name FROM users WHERE id = ${beg.from_user_id}`);
      const fromName = (fromUser.rows[0] as any)?.display_name ?? "пользователь";
      db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'sent', ${-amount}, ${"Отправлено по запросу: " + fromName})`).catch(() => {});
      db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${beg.from_user_id}, 'received', ${amount}, ${"Получено по запросу 💎"})`).catch(() => {});

      res.json({ success: true, balance: newBalance });
    } catch (txErr) {
      await db.execute(sql`ROLLBACK`);
      throw txErr;
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/beg/:id/decline", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const begId = parseInt(req.params.id, 10);
    const result = await db.execute(sql`
      UPDATE spark_beg_requests SET status = 'declined'
      WHERE id = ${begId} AND to_user_id = ${uid} AND status = 'pending'
    `);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: "Запрос не найден" });
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;

