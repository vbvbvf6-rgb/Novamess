import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../app";
import { generateTotpSecret, verifyTotp, buildTotpUri } from "../lib/totp";

const router = Router();
const SALT_ROUNDS = 12;
const TOKEN_TTL = "30d";
const PENDING_2FA_TTL = "5m";

const sha256 = (pass: string) => createHash("sha256").update(pass).digest("hex");

function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function signPending2faToken(userId: number): string {
  return jwt.sign({ userId, pending2fa: true }, JWT_SECRET, { expiresIn: PENDING_2FA_TTL });
}

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Укажите никнейм и пароль" });
    }
    if (String(username).length > 100 || String(password).length > 200) {
      return res.status(400).json({ error: "Неверное имя или пароль" });
    }

    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, bio, status, status_text,
                 is_verified, is_bot, is_admin, created_at, balance, password_hash,
                 COALESCE(totp_enabled, false) as totp_enabled,
                 COALESCE(age_verified, false) as age_verified
          FROM users
          WHERE LOWER(username) = LOWER(${String(username).trim()})
             OR LOWER(display_name) = LOWER(${String(username).trim()})
          ORDER BY CASE WHEN LOWER(username) = LOWER(${String(username).trim()}) THEN 0 ELSE 1 END
          LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) {
      return res.status(401).json({ error: "Неверное имя или пароль" });
    }

    const pass = String(password);
    let passwordValid = false;
    const storedHash: string = user.password_hash || "";

    if (storedHash.startsWith("$2")) {
      passwordValid = await bcrypt.compare(pass, storedHash);
    } else {
      passwordValid = storedHash === sha256(pass);
      if (passwordValid) {
        const newHash = await bcrypt.hash(pass, SALT_ROUNDS);
        await db.execute(sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`);
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Неверное имя или пароль" });
    }

    if (user.totp_enabled) {
      const pendingToken = signPending2faToken(user.id);
      return res.json({
        requiresTwoFactor: true,
        pendingToken,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarColor: user.avatar_color,
        },
      });
    }

    const token = signToken(user.id);
    const ageVerified = user.age_verified === true || user.age_verified === "t" || user.age_verified === 1;

    res.json({
      userId: user.id,
      token,
      ageVerified,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        status: user.status,
        statusText: user.status_text,
        isVerified: user.is_verified,
        isAdmin: user.is_admin === true || user.is_admin === "t" || user.is_admin === 1,
        isBot: user.is_bot === true || user.is_bot === "t" || user.is_bot === 1,
        balance: Number(user.balance ?? 0),
        createdAt: user.created_at,
        ageVerified,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/2fa/complete", async (req, res) => {
  try {
    const { pendingToken, code } = req.body;
    if (!pendingToken || !code) {
      return res.status(400).json({ error: "Укажите токен и код" });
    }

    let payload: any;
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET) as any;
    } catch {
      return res.status(401).json({ error: "Сессия истекла. Войдите заново." });
    }

    if (!payload.pending2fa) {
      return res.status(400).json({ error: "Неверный токен" });
    }

    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, bio, status, status_text,
                 is_verified, balance, created_at, totp_secret
          FROM users WHERE id = ${payload.userId} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user || !user.totp_secret) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (!verifyTotp(user.totp_secret, String(code))) {
      return res.status(401).json({ error: "Неверный код. Проверьте приложение аутентификации." });
    }

    const token = signToken(user.id);
    res.json({
      userId: user.id,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        status: user.status,
        statusText: user.status_text,
        isVerified: user.is_verified,
        balance: Number(user.balance ?? 0),
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/auth/2fa/setup", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(
      sql`SELECT username, totp_enabled FROM users WHERE id = ${uid} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (user.totp_enabled) {
      return res.status(400).json({ error: "2FA уже включена" });
    }

    const secret = generateTotpSecret();
    await db.execute(sql`UPDATE users SET totp_secret = ${secret} WHERE id = ${uid}`);

    const uri = buildTotpUri(secret, user.username);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
    res.json({ secret, uri, qrUrl });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/2fa/enable", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Укажите код" });

    const rows = await db.execute(
      sql`SELECT totp_secret, totp_enabled FROM users WHERE id = ${uid} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (user.totp_enabled) return res.status(400).json({ error: "2FA уже включена" });
    if (!user.totp_secret) return res.status(400).json({ error: "Сначала получите настройки 2FA" });

    if (!verifyTotp(user.totp_secret, String(code))) {
      return res.status(401).json({ error: "Неверный код. Проверьте приложение аутентификации." });
    }

    await db.execute(sql`UPDATE users SET totp_enabled = true WHERE id = ${uid}`);
    res.json({ success: true, message: "Двухфакторная аутентификация включена" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/2fa/disable", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Укажите пароль для отключения 2FA" });

    const rows = await db.execute(
      sql`SELECT password_hash, totp_enabled FROM users WHERE id = ${uid} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (!user.totp_enabled) return res.status(400).json({ error: "2FA не включена" });

    const storedHash: string = user.password_hash || "";
    let valid = false;
    if (storedHash.startsWith("$2")) {
      valid = await bcrypt.compare(String(password), storedHash);
    } else {
      valid = storedHash === sha256(String(password));
    }
    if (!valid) return res.status(401).json({ error: "Неверный пароль" });

    await db.execute(
      sql`UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE id = ${uid}`
    );
    res.json({ success: true, message: "Двухфакторная аутентификация отключена" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { username, displayName, password, ageGroup, birthDate } = req.body;
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    const rawUsername = String(username).trim();
    const rawDisplay = String(displayName).trim();
    const rawPass = String(password);

    if (rawUsername.length < 3 || rawUsername.length > 32) {
      return res.status(400).json({ error: "Никнейм должен быть от 3 до 32 символов" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(rawUsername)) {
      return res.status(400).json({ error: "Никнейм может содержать только буквы, цифры и _" });
    }
    if (rawDisplay.length < 1 || rawDisplay.length > 60) {
      return res.status(400).json({ error: "Имя должно быть от 1 до 60 символов" });
    }
    if (rawPass.length < 6 || rawPass.length > 200) {
      return res.status(400).json({ error: "Пароль должен быть от 6 до 200 символов" });
    }

    const existing = await db.execute(
      sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${rawUsername})`
    );
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Этот никнейм уже занят" });
    }

    const COLORS = ["#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6","#06B6D4","#EF4444","#F97316"];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const passwordHash = await bcrypt.hash(rawPass, SALT_ROUNDS);

    const rawBirthDate = birthDate ? String(birthDate) : null;
    const result = await db.execute(
      sql`INSERT INTO users (username, display_name, avatar_color, status, password_hash, balance, age_group, birth_date, age_verified)
          VALUES (${rawUsername}, ${rawDisplay}, ${color}, 'online', ${passwordHash}, 0, ${ageGroup ? String(ageGroup) : null}, ${rawBirthDate}, true)
          RETURNING id, username, display_name, avatar_color, status, created_at, balance`
    );
    const newUser = result.rows[0] as any;

    try {
      await db.execute(
        sql`INSERT INTO chat_members (chat_id, user_id, role, last_read_at)
            SELECT id, ${newUser.id}, 'member', NOW()
            FROM chats WHERE type IN ('group', 'channel') AND id IN (2, 3)
            ON CONFLICT DO NOTHING`
      );
    } catch {}

    const token = signToken(newUser.id);

    res.status(201).json({
      userId: newUser.id,
      token,
      ageVerified: false,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        avatarColor: newUser.avatar_color,
        status: newUser.status,
        balance: Number(newUser.balance ?? 0),
        createdAt: newUser.created_at,
        ageVerified: false,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/change-password", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Укажите текущий и новый пароль" });
    }
    if (String(newPassword).length < 6 || String(newPassword).length > 200) {
      return res.status(400).json({ error: "Новый пароль должен быть от 6 до 200 символов" });
    }

    const rows = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const storedHash: string = user.password_hash || "";
    let valid = false;
    if (storedHash.startsWith("$2")) {
      valid = await bcrypt.compare(String(currentPassword), storedHash);
    } else {
      valid = storedHash === sha256(String(currentPassword));
    }

    if (!valid) {
      return res.status(401).json({ error: "Неверный текущий пароль" });
    }

    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await db.execute(sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${uid}`);
    const newToken = signToken(uid);
    res.json({ success: true, message: "Пароль успешно изменён", token: newToken });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/auth/security-question", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().replace(/^@/, "");
    if (!username) return res.status(400).json({ error: "Укажите никнейм" });

    const rows = await db.execute(
      sql`SELECT security_question FROM users WHERE lower(username) = lower(${username}) LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user || !user.security_question) {
      return res.status(404).json({ error: "Контрольный вопрос не установлен для этого аккаунта" });
    }
    res.json({ question: user.security_question });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { username, answer, newPassword } = req.body;
    if (!username || !answer || !newPassword) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }
    if (String(newPassword).length < 6 || String(newPassword).length > 200) {
      return res.status(400).json({ error: "Новый пароль — минимум 6 символов" });
    }

    const rows = await db.execute(
      sql`SELECT id, security_question, security_answer FROM users WHERE lower(username) = lower(${String(username).replace(/^@/, "")}) LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user || !user.security_answer) {
      return res.status(404).json({ error: "Аккаунт не найден или контрольный вопрос не установлен" });
    }

    const valid = await bcrypt.compare(String(answer).toLowerCase().trim(), user.security_answer);
    if (!valid) {
      return res.status(401).json({ error: "Неверный ответ на контрольный вопрос" });
    }

    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await db.execute(sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`);

    const newToken = signToken(user.id);
    res.json({ success: true, token: newToken });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.put("/users/me/security-question", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: "Укажите вопрос и ответ" });
    }
    if (String(question).length > 200) {
      return res.status(400).json({ error: "Вопрос слишком длинный" });
    }
    if (String(answer).trim().length < 2 || String(answer).length > 200) {
      return res.status(400).json({ error: "Ответ должен быть от 2 до 200 символов" });
    }

    const answerHash = await bcrypt.hash(String(answer).toLowerCase().trim(), SALT_ROUNDS);
    await db.execute(
      sql`UPDATE users SET security_question = ${String(question)}, security_answer = ${answerHash} WHERE id = ${uid}`
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/users/me/security-question/check", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(
      sql`SELECT security_question FROM users WHERE id = ${uid} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ hasQuestion: !!user.security_question, question: user.security_question || null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
