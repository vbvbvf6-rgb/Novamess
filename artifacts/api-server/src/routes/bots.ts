import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "node:crypto";

const router = Router();

function generateToken(): string {
  const part1 = Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000).toString();
  const part2 = crypto.randomBytes(20).toString("base64url");
  return `${part1}:${part2}`;
}

function randomColor(): string {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  return colors[Math.floor(Math.random() * colors.length)];
}

router.get("/bots", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT bt.id, bt.token, bt.created_at,
             u.id as bot_user_id, u.username, u.display_name, u.avatar_url, u.avatar_color, u.bio,
             bw.url as webhook_url
      FROM bot_tokens bt
      JOIN users u ON u.id = bt.bot_user_id
      LEFT JOIN bot_webhooks bw ON bw.bot_user_id = bt.bot_user_id
      WHERE bt.owner_user_id = ${uid}
      ORDER BY bt.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/bots", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { name, username, description } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Имя бота должно содержать минимум 2 символа" });
    }
    if (!username || typeof username !== "string" || !/^[a-z0-9_]{3,32}bot$/i.test(username)) {
      return res.status(400).json({ error: "Username должен заканчиваться на 'bot' и содержать 3–32 символа (a-z, 0-9, _)" });
    }

    const lower = username.toLowerCase();
    const existing = await db.execute(sql`SELECT id FROM users WHERE username = ${lower}`);
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Username уже занят" });
    }

    const countRows = await db.execute(sql`SELECT COUNT(*) as c FROM bot_tokens WHERE owner_user_id = ${uid}`);
    if (Number((countRows.rows[0] as any)?.c ?? 0) >= 20) {
      return res.status(400).json({ error: "Максимум 20 ботов на аккаунт" });
    }

    const color = randomColor();
    const userRows = await db.execute(sql`
      INSERT INTO users (username, display_name, bio, avatar_color, is_bot, is_verified, password_hash)
      VALUES (${lower}, ${name.trim()}, ${description?.trim() || null}, ${color}, true, true, null)
      RETURNING id
    `);
    const botUserId = (userRows.rows[0] as any).id;
    const token = generateToken();

    await db.execute(sql`
      INSERT INTO bot_tokens (owner_user_id, bot_user_id, token) VALUES (${uid}, ${botUserId}, ${token})
    `);

    res.status(201).json({
      id: botUserId,
      username: lower,
      displayName: name.trim(),
      description: description?.trim() || null,
      avatarColor: color,
      token,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/bots/:botId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const botId = Number(req.params.botId);
    const { name, description, avatarUrl } = req.body;

    const own = await db.execute(sql`SELECT id FROM bot_tokens WHERE owner_user_id = ${uid} AND bot_user_id = ${botId}`);
    if ((own.rows as any[]).length === 0) return res.status(403).json({ error: "Нет доступа" });

    if (name && typeof name === "string" && name.trim().length >= 2) {
      await db.execute(sql`UPDATE users SET display_name = ${name.trim()} WHERE id = ${botId}`);
    }
    if (description !== undefined) {
      const bio = description?.trim() || null;
      await db.execute(sql`UPDATE users SET bio = ${bio} WHERE id = ${botId}`);
    }
    if (avatarUrl !== undefined) {
      const av = avatarUrl || null;
      await db.execute(sql`UPDATE users SET avatar_url = ${av} WHERE id = ${botId}`);
    }

    const rows = await db.execute(sql`SELECT id, username, display_name, bio, avatar_color, avatar_url FROM users WHERE id = ${botId}`);
    res.json(rows.rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/bots/:botId/token", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const botId = Number(req.params.botId);

    const own = await db.execute(sql`SELECT id FROM bot_tokens WHERE owner_user_id = ${uid} AND bot_user_id = ${botId}`);
    if ((own.rows as any[]).length === 0) return res.status(403).json({ error: "Нет доступа" });

    const newToken = generateToken();
    await db.execute(sql`UPDATE bot_tokens SET token = ${newToken} WHERE owner_user_id = ${uid} AND bot_user_id = ${botId}`);
    res.json({ token: newToken });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/bots/:botId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const botId = Number(req.params.botId);

    const own = await db.execute(sql`SELECT id FROM bot_tokens WHERE owner_user_id = ${uid} AND bot_user_id = ${botId}`);
    if ((own.rows as any[]).length === 0) return res.status(403).json({ error: "Нет доступа" });

    await db.execute(sql`DELETE FROM bot_webhooks WHERE bot_user_id = ${botId}`);
    await db.execute(sql`DELETE FROM bot_updates WHERE bot_user_id = ${botId}`);
    await db.execute(sql`DELETE FROM bot_tokens WHERE bot_user_id = ${botId}`);
    await db.execute(sql`DELETE FROM chat_members WHERE user_id = ${botId}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${botId}`);

    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
