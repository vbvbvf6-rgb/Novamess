import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance });
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

    const senderRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const senderBalance = Number((senderRows.rows[0] as any)?.balance ?? 0);
    if (senderBalance < amount) {
      return res.status(400).json({ error: `Недостаточно Spark. Ваш баланс: ${senderBalance}` });
    }

    await db.execute(sql`UPDATE users SET balance = balance - ${amount} WHERE id = ${uid}`);
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${targetId}`);

    const updatedRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((updatedRows.rows[0] as any)?.balance ?? 0);

    res.json({ success: true, balance: newBalance, recipient: target.displayName, amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/stats/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const [msgs, calls] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ${uid}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls WHERE caller_id = ${uid}`),
    ]);
    res.json({
      messagesSent: Number((msgs.rows[0] as any)?.cnt ?? 0),
      callsMade: Number((calls.rows[0] as any)?.cnt ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
