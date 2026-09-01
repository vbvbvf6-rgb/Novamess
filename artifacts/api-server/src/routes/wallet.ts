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
      return res.status(400).json({ error: `Недостаточно Nova. Ваш баланс: ${balance} ✦`, balance });
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
      return res.status(400).json({ error: `Недостаточно Nova. Ваш баланс: ${senderBalance} ✦` });
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

export default router;

