import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { EFFECTIVE_JWT_SECRET, sanitizeString, invalidateSessionCache } from "../app";
import { generateTotpSecret, verifyTotp, buildTotpUri } from "../lib/totp";
import { sendVerificationEmail, sendPasswordResetEmail, isMailerConfigured } from "../lib/mailer";

const router = Router();
const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

// ── Password strength check ────────────────────────────────────────────────
function validatePassword(pass: string): { ok: boolean; error?: string } {
  if (pass.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Пароль должен быть не менее ${MIN_PASSWORD_LENGTH} символов` };
  }
  if (pass.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: "Пароль слишком длинный" };
  }
  return { ok: true };
}

// ── In-memory brute force tracker (per username AND per IP, resets on success) ─
// Tracks both the account being targeted and the source IP so an attacker can't
// dodge the lockout by spraying many usernames from one IP, or many IPs at one
// username. Lockout duration grows with repeated offenses (progressive backoff).
const loginFailures = new Map<string, { count: number; until: number; strikes: number }>();
const MAX_LOGIN_FAILS = 5;
const BASE_LOCKOUT_MS = 60 * 1000; // 1 min for the first lockout
const MAX_LOCKOUT_MS = 30 * 60 * 1000; // caps at 30 min after repeated offenses

function isLockedOut(key: string): boolean {
  const entry = loginFailures.get(key);
  if (!entry) return false;
  if (Date.now() > entry.until) return false;
  return entry.count >= MAX_LOGIN_FAILS;
}
function lockoutRemainingMs(key: string): number {
  const entry = loginFailures.get(key);
  if (!entry) return 0;
  return Math.max(0, entry.until - Date.now());
}
function recordFailure(key: string): void {
  const entry = loginFailures.get(key) ?? { count: 0, until: 0, strikes: 0 };
  entry.count += 1;
  if (entry.count >= MAX_LOGIN_FAILS) {
    // Each additional lockout doubles the wait time (1m, 2m, 4m, ... capped at 30m)
    const lockoutMs = Math.min(BASE_LOCKOUT_MS * Math.pow(2, entry.strikes), MAX_LOCKOUT_MS);
    entry.until = Date.now() + lockoutMs;
    entry.strikes += 1;
    entry.count = 0;
  }
  loginFailures.set(key, entry);
}
function clearFailures(key: string): void {
  loginFailures.delete(key);
}
// Small constant-time-ish delay slows down scripted brute-force attempts
// without materially affecting legitimate logins.
function bruteForceDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200));
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
const TOKEN_TTL = "90d";
const PENDING_2FA_TTL = "5m";

const sha256 = (pass: string) => createHash("sha256").update(pass).digest("hex");

function signToken(userId: number, sessionId?: string): string {
  return jwt.sign({ userId, ...(sessionId ? { sid: sessionId } : {}) }, EFFECTIVE_JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function signPending2faToken(userId: number): string {
  return jwt.sign({ userId, pending2fa: true }, EFFECTIVE_JWT_SECRET, { expiresIn: PENDING_2FA_TTL });
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

    const ukey = String(username).toLowerCase().trim();
    const ipKey = `ip:${req.ip || "unknown"}`;

    // ── Brute force: block after repeated failures, either by account or by IP ─
    if (isLockedOut(ukey) || isLockedOut(ipKey)) {
      await bruteForceDelay();
      const waitMin = Math.max(1, Math.ceil(Math.max(lockoutRemainingMs(ukey), lockoutRemainingMs(ipKey)) / 60000));
      return res.status(429).json({ error: `Слишком много неудачных попыток входа. Подождите ${waitMin} мин.` });
    }

    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, bio, status, status_text,
                 is_verified, is_bot, is_admin, is_banned, created_at, balance, password_hash,
                 COALESCE(totp_enabled, false) as totp_enabled,
                 COALESCE(age_verified, false) as age_verified
          FROM users
          WHERE LOWER(username) = ${ukey}
             OR LOWER(display_name) = ${ukey}
          ORDER BY CASE WHEN LOWER(username) = ${ukey} THEN 0 ELSE 1 END
          LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) {
      recordFailure(ukey);
      recordFailure(ipKey);
      await bruteForceDelay();
      return res.status(401).json({ error: "Неверное имя или пароль" });
    }

    // ── Ban check ──────────────────────────────────────────────────────────
    if (user.is_banned === true || user.is_banned === "t" || user.is_banned === 1) {
      return res.status(403).json({ error: "Ваш аккаунт заблокирован. Обратитесь в поддержку." });
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
      recordFailure(ukey);
      recordFailure(ipKey);
      await bruteForceDelay();
      return res.status(401).json({ error: "Неверное имя или пароль" });
    }

    // ── Successful login — clear failure counters ──────────────────────────
    clearFailures(ukey);
    clearFailures(ipKey);

    // ── Create session record ──────────────────────────────────────────────
    const sessionId = randomUUID();
    const ua = req.headers["user-agent"] || "Unknown";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const deviceName = ua.length > 200 ? ua.slice(0, 200) : ua;
    try {
      await db.execute(sql`
        INSERT INTO user_sessions (id, user_id, device, ip_address, created_at, last_active_at)
        VALUES (${sessionId}, ${user.id}, ${deviceName}, ${ip}, NOW(), NOW())
      `);
    } catch { /* table may not exist yet, non-fatal */ }

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

    const token = signToken(user.id, sessionId);
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
      payload = jwt.verify(pendingToken, EFFECTIVE_JWT_SECRET) as any;
    } catch {
      return res.status(401).json({ error: "Сессия истекла. Войдите заново." });
    }

    if (!payload.pending2fa) {
      return res.status(400).json({ error: "Неверный токен" });
    }

    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, bio, status, status_text,
                 is_verified, is_admin, is_bot, balance, created_at, totp_secret,
                 COALESCE(age_verified, false) as age_verified
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

router.post("/auth/verify-email", async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: "userId и code обязательны" });

    const rows = await db.execute(
      sql`SELECT id, email_verification_code, email_verification_expires_at FROM users WHERE id = ${Number(userId)} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    if (!user.email_verification_code) {
      return res.status(400).json({ error: "Код подтверждения не установлен" });
    }
    if (new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ error: "Код истёк. Запросите новый." });
    }
    if (String(user.email_verification_code) !== String(code).trim()) {
      return res.status(401).json({ error: "Неверный код" });
    }

    await db.execute(
      sql`UPDATE users SET email_verified = true, email_verification_code = NULL, email_verification_expires_at = NULL WHERE id = ${Number(userId)}`
    );
    res.json({ success: true, message: "Email подтверждён" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// In-memory cooldown so a user can't spam themselves (or someone else's
// inbox) with resend requests.
const resendCooldowns = new Map<number, number>();
const RESEND_COOLDOWN_MS = 60 * 1000;

router.post("/auth/resend-verification", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId обязателен" });
    const uid = Number(userId);

    const lastSent = resendCooldowns.get(uid) ?? 0;
    const waitMs = RESEND_COOLDOWN_MS - (Date.now() - lastSent);
    if (waitMs > 0) {
      return res.status(429).json({ error: `Подождите ${Math.ceil(waitMs / 1000)} сек перед повторной отправкой` });
    }

    const rows = await db.execute(
      sql`SELECT id, email, email_verified FROM users WHERE id = ${uid} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (!user.email) return res.status(400).json({ error: "У аккаунта не указан email" });
    if (user.email_verified) return res.status(400).json({ error: "Email уже подтверждён" });

    if (!isMailerConfigured()) {
      return res.status(503).json({ error: "Отправка писем временно недоступна. Попробуйте позже." });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 30 * 60 * 1000);
    await db.execute(
      sql`UPDATE users SET email_verification_code = ${code}, email_verification_expires_at = ${expiry.toISOString()} WHERE id = ${uid}`
    );

    resendCooldowns.set(uid, Date.now());
    const sent = await sendVerificationEmail(String(user.email), code);
    if (!sent) {
      return res.status(502).json({ error: "Не удалось отправить письмо. Попробуйте позже." });
    }
    res.json({ success: true, message: "Код отправлен повторно" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { username, displayName, password, ageGroup, birthDate, email, avatarUrl, referralCode } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    const rawUsername = String(username).trim().slice(0, 32);
    // If displayName not provided, use username as display name
    const rawDisplay = sanitizeString(displayName || username, 60);
    const rawPass = String(password);

    if (rawUsername.length < 3 || rawUsername.length > 32) {
      return res.status(400).json({ error: "Никнейм должен быть от 3 до 32 символов" });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(rawUsername)) {
      return res.status(400).json({ error: "Никнейм может содержать только буквы, цифры и _" });
    }
    const passCheck = validatePassword(rawPass);
    if (!passCheck.ok) {
      return res.status(400).json({ error: passCheck.error });
    }

    const existing = await db.execute(
      sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${rawUsername})`
    );
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Этот никнейм уже занят" });
    }

    const rawEmail = email ? String(email).trim().toLowerCase() : null;
    if (rawEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        return res.status(400).json({ error: "Неверный формат email" });
      }
      const emailExists = await db.execute(sql`SELECT id FROM users WHERE email = ${rawEmail} LIMIT 1`);
      if ((emailExists.rows as any[]).length > 0) {
        return res.status(409).json({ error: "Этот email уже используется" });
      }
    }

    const COLORS = ["#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6","#06B6D4","#EF4444","#F97316"];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const passwordHash = await bcrypt.hash(rawPass, SALT_ROUNDS);

    const rawBirthDate = birthDate ? String(birthDate) : null;

    let verificationCode: string | null = null;
    let verificationExpiry: Date | null = null;
    if (rawEmail) {
      verificationCode = String(Math.floor(100000 + Math.random() * 900000));
      verificationExpiry = new Date(Date.now() + 30 * 60 * 1000);
    }

    const rawAvatarUrl = avatarUrl ? String(avatarUrl) : null;

    const newReferralCode = generateReferralCode();

    const REFERRAL_BONUS = 50;

    let validReferredBy: string | null = null;
    if (referralCode) {
      const refRows = await db.execute(
        sql`SELECT referral_code FROM users WHERE referral_code = ${String(referralCode).trim().toUpperCase()} LIMIT 1`
      );
      if ((refRows.rows as any[]).length > 0) {
        validReferredBy = String(referralCode).trim().toUpperCase();
      }
    }

    const result = await db.execute(
      sql`INSERT INTO users (username, display_name, avatar_color, avatar_url, status, password_hash, balance, age_group, birth_date, age_verified, email, email_verified, email_verification_code, email_verification_expires_at, referral_code, referred_by)
          VALUES (${rawUsername}, ${rawDisplay}, ${color}, ${rawAvatarUrl}, 'online', ${passwordHash}, 0, ${ageGroup ? String(ageGroup) : null}, ${rawBirthDate}, true, ${rawEmail}, ${rawEmail ? false : false}, ${verificationCode}, ${verificationExpiry ? verificationExpiry.toISOString() : null}, ${newReferralCode}, ${validReferredBy})
          RETURNING id, username, display_name, avatar_color, avatar_url, status, created_at, balance`
    );
    const newUser = result.rows[0] as any;

    // Reward the referrer with bonus coins
    if (validReferredBy) {
      try {
        await db.execute(
          sql`UPDATE users SET balance = balance + ${REFERRAL_BONUS} WHERE referral_code = ${validReferredBy}`
        );
      } catch {}
    }

    // Auto-join all existing channels
    try {
      await db.execute(
        sql`INSERT INTO chat_members (chat_id, user_id, role, last_read_at)
            SELECT id, ${newUser.id}, 'member', NOW()
            FROM chats WHERE type = 'channel'
            ON CONFLICT DO NOTHING`
      );
    } catch {}

    const token = signToken(newUser.id);

    let emailSent = false;
    if (rawEmail && verificationCode) {
      try {
        emailSent = await sendVerificationEmail(rawEmail, verificationCode);
        if (!emailSent) {
          console.error(`[mailer] Email NOT delivered to ${rawEmail} — returned false. Check MAIL_FROM + Elastic Email verified senders.`);
        }
      } catch (err: any) {
        console.error("[mailer] Registration email threw:", err?.message ?? err);
      }
    }

    res.status(201).json({
      userId: newUser.id,
      token,
      ageVerified: false,
      requiresEmailVerification: !!rawEmail,
      emailSent,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        avatarColor: newUser.avatar_color,
        status: newUser.status,
        balance: Number(newUser.balance ?? 0),
        createdAt: newUser.created_at,
        ageVerified: false,
        email: rawEmail,
        emailVerified: false,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/verify-password", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Пароль обязателен" });
    const rows = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${uid}`);
    if (!rows.rows.length) return res.status(404).json({ error: "Пользователь не найден" });
    const user = rows.rows[0] as any;
    const storedHash: string = user.password_hash || "";
    let valid = false;
    try {
      if (storedHash.startsWith("$2")) {
        valid = await bcrypt.compare(String(password), storedHash);
      } else {
        valid = storedHash === sha256(String(password));
      }
    } catch {}
    if (!valid) return res.status(401).json({ error: "Неверный пароль" });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/change-password", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Укажите текущий и новый пароль" });
    }
    const newPassCheck = validatePassword(String(newPassword));
    if (!newPassCheck.ok) {
      return res.status(400).json({ error: newPassCheck.error });
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
    const resetPassCheck = validatePassword(String(newPassword));
    if (!resetPassCheck.ok) {
      return res.status(400).json({ error: resetPassCheck.error });
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

// ── Email-based password reset ─────────────────────────────────────────────
// In-memory cooldown so users can't spam the reset code endpoint
const resetCooldowns = new Map<number, number>();
const RESET_COOLDOWN_MS = 60 * 1000;

function signPasswordResetToken(userId: number): string {
  return jwt.sign({ userId, passwordReset: true }, EFFECTIVE_JWT_SECRET, { expiresIn: "15m" });
}

// Step 1: look up user, return recovery options, send email code if possible
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const raw = String(req.body.username || "").trim().replace(/^@/, "");
    if (!raw) return res.status(400).json({ error: "Укажите никнейм" });

    const rows = await db.execute(
      sql`SELECT id, email, email_verified, security_question
          FROM users WHERE lower(username) = lower(${raw}) LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const hasEmail = !!user.email;
    const hasSecurityQuestion = !!user.security_question;

    // Send reset code via email (fire-and-forget, non-blocking)
    let codeSent = false;
    if (hasEmail && isMailerConfigured()) {
      const lastSent = resetCooldowns.get(user.id) ?? 0;
      if (Date.now() - lastSent >= RESET_COOLDOWN_MS) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await db.execute(
          sql`UPDATE users SET password_reset_code = ${code}, password_reset_expires_at = ${expiry.toISOString()} WHERE id = ${user.id}`
        );
        resetCooldowns.set(user.id, Date.now());
        sendPasswordResetEmail(String(user.email), code).catch(() => {});
        codeSent = true;
      }
    }

    const maskedEmail = hasEmail
      ? (() => {
          const [local, domain] = String(user.email).split("@");
          const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
          return `${visible}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
        })()
      : null;

    res.json({
      userId: user.id,
      hasEmail,
      maskedEmail,
      hasSecurityQuestion,
      securityQuestion: user.security_question ?? null,
      codeSent,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Resend password reset code
router.post("/auth/forgot-password/resend", async (req, res) => {
  try {
    const uid = Number(req.body.userId);
    if (!uid) return res.status(400).json({ error: "userId обязателен" });

    const lastSent = resetCooldowns.get(uid) ?? 0;
    const waitMs = RESET_COOLDOWN_MS - (Date.now() - lastSent);
    if (waitMs > 0) {
      return res.status(429).json({ error: `Подождите ${Math.ceil(waitMs / 1000)} сек` });
    }

    const rows = await db.execute(sql`SELECT id, email FROM users WHERE id = ${uid} LIMIT 1`);
    const user = rows.rows[0] as any;
    if (!user || !user.email) return res.status(404).json({ error: "Пользователь не найден или email не указан" });

    if (!isMailerConfigured()) return res.status(503).json({ error: "Отправка писем временно недоступна" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await db.execute(
      sql`UPDATE users SET password_reset_code = ${code}, password_reset_expires_at = ${expiry.toISOString()} WHERE id = ${uid}`
    );
    resetCooldowns.set(uid, Date.now());
    const sent = await sendPasswordResetEmail(String(user.email), code);
    if (!sent) return res.status(502).json({ error: "Не удалось отправить письмо" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Step 2a: verify email code → return short-lived resetToken
router.post("/auth/reset-password-via-email/verify", async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: "userId и code обязательны" });

    const rows = await db.execute(
      sql`SELECT id, password_reset_code, password_reset_expires_at FROM users WHERE id = ${Number(userId)} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    if (!user.password_reset_code) return res.status(400).json({ error: "Код не запрашивался. Вернитесь и попробуйте снова." });
    if (new Date(user.password_reset_expires_at) < new Date()) return res.status(400).json({ error: "Код истёк. Запросите новый." });
    if (String(user.password_reset_code) !== String(code).trim()) return res.status(401).json({ error: "Неверный код" });

    // Invalidate code after use
    await db.execute(sql`UPDATE users SET password_reset_code = NULL, password_reset_expires_at = NULL WHERE id = ${Number(userId)}`);

    res.json({ resetToken: signPasswordResetToken(Number(userId)) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Step 2b: verify security question → return short-lived resetToken
router.post("/auth/reset-password/verify-question", async (req, res) => {
  try {
    const { userId, answer } = req.body;
    if (!userId || !answer) return res.status(400).json({ error: "userId и answer обязательны" });

    const rows = await db.execute(
      sql`SELECT id, security_answer FROM users WHERE id = ${Number(userId)} LIMIT 1`
    );
    const user = rows.rows[0] as any;
    if (!user || !user.security_answer) return res.status(404).json({ error: "Контрольный вопрос не задан" });

    const valid = await bcrypt.compare(String(answer).toLowerCase().trim(), user.security_answer);
    if (!valid) return res.status(401).json({ error: "Неверный ответ на контрольный вопрос" });

    res.json({ resetToken: signPasswordResetToken(Number(userId)) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Step 3: set new password using resetToken
router.post("/auth/reset-password-final", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ error: "Все поля обязательны" });

    let payload: any;
    try {
      payload = jwt.verify(resetToken, EFFECTIVE_JWT_SECRET) as any;
    } catch {
      return res.status(401).json({ error: "Ссылка для сброса устарела. Начните заново." });
    }
    if (!payload.passwordReset) return res.status(400).json({ error: "Неверный токен" });

    const passCheck = validatePassword(String(newPassword));
    if (!passCheck.ok) return res.status(400).json({ error: passCheck.error });

    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await db.execute(sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${payload.userId}`);

    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, status FROM users WHERE id = ${payload.userId} LIMIT 1`
    );
    const user = rows.rows[0] as any;

    const sessionId = randomUUID();
    try {
      const ua = req.headers["user-agent"] || "Unknown";
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      await db.execute(sql`
        INSERT INTO user_sessions (id, user_id, device, ip_address, created_at, last_active_at)
        VALUES (${sessionId}, ${payload.userId}, ${ua.slice(0, 200)}, ${ip}, NOW(), NOW())
      `);
    } catch { /* non-fatal */ }

    const token = signToken(payload.userId, sessionId);
    res.json({
      success: true,
      token,
      userId: payload.userId,
      user: user ? {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url,
        status: user.status,
      } : null,
    });
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

// ── Sessions management ────────────────────────────────────────────────────

router.get("/auth/sessions", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT id, device, ip_address, created_at, last_active_at
      FROM user_sessions
      WHERE user_id = ${uid}
      ORDER BY last_active_at DESC
      LIMIT 20
    `);
    // Figure out which session is current (by sid in JWT)
    const authHeader = req.headers["authorization"];
    let currentSid: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.slice(7), EFFECTIVE_JWT_SECRET) as any;
        currentSid = payload.sid || null;
      } catch {}
    }
    const sessions = (rows.rows as any[]).map(s => ({
      id: s.id,
      device: s.device,
      ip: s.ip_address,
      createdAt: s.created_at,
      lastActiveAt: s.last_active_at,
      isCurrent: s.id === currentSid,
    }));
    res.json({ sessions });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/auth/sessions/:id", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { id } = req.params;
    await db.execute(sql`
      DELETE FROM user_sessions WHERE id = ${id} AND user_id = ${uid}
    `);
    invalidateSessionCache(id);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/auth/sessions", async (req, res) => {
  try {
    const uid = req.currentUserId;
    // Delete all sessions except current
    const authHeader = req.headers["authorization"];
    let currentSid: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.slice(7), EFFECTIVE_JWT_SECRET) as any;
        currentSid = payload.sid || null;
      } catch {}
    }
    // Find all sessions being deleted so we can purge the cache
    const toDelete = await db.execute(sql`
      SELECT id FROM user_sessions
      WHERE user_id = ${uid}
      ${currentSid ? sql`AND id != ${currentSid}` : sql``}
    `);
    if (currentSid) {
      await db.execute(sql`
        DELETE FROM user_sessions WHERE user_id = ${uid} AND id != ${currentSid}
      `);
    } else {
      await db.execute(sql`DELETE FROM user_sessions WHERE user_id = ${uid}`);
    }
    // Purge cache for each deleted session
    for (const row of (toDelete as any).rows ?? toDelete) {
      invalidateSessionCache(row.id);
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/logout", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.slice(7), EFFECTIVE_JWT_SECRET) as any;
        if (payload.sid) {
          await db.execute(sql`DELETE FROM user_sessions WHERE id = ${payload.sid} AND user_id = ${uid}`);
        }
      } catch {}
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
