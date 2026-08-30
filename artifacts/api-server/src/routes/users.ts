import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, like, or, sql } from "drizzle-orm";
import { UpdateMeBody } from "@workspace/api-zod";
import { offloadDataUrl } from "../lib/objectStorage";
import { sendVerificationEmail, isMailerConfigured } from "../lib/mailer";

const router = Router();

db.execute(sql`CREATE TABLE IF NOT EXISTS prize_codes (
  id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, prize_amount INTEGER NOT NULL DEFAULT 0 CHECK (prize_amount > 0),
  prize_description TEXT, max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0), uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`).catch(() => {});
db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_public_key TEXT`).catch(() => {});
db.execute(sql`ALTER TABLE prize_codes ADD COLUMN IF NOT EXISTS prize_type TEXT NOT NULL DEFAULT 'sparks'`).catch(() => {});
db.execute(sql`ALTER TABLE prize_codes ADD COLUMN IF NOT EXISTS prime_months INTEGER`).catch(() => {});
db.execute(sql`ALTER TABLE prize_codes ADD COLUMN IF NOT EXISTS nickname_style TEXT`).catch(() => {});
db.execute(sql`CREATE TABLE IF NOT EXISTS prize_code_redemptions (
  id SERIAL PRIMARY KEY, code_id INTEGER NOT NULL REFERENCES prize_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (code_id, user_id)
)`).catch(() => {});

router.get("/users/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const rows = await db.execute(sql`SELECT balance, username_changed_at, has_prime, prime_tier, prime_expires_at, age_verified, is_admin, is_developer, is_youtube_creator, is_tiktok_creator, is_bot, nickname_style FROM users WHERE id = ${uid}`);
    const row = rows.rows[0] as any;
    const balance = row ? Number(row.balance) : 0;
    const hasPrime = row?.has_prime === true || row?.has_prime === "t" || row?.has_prime === 1;
    const primeTier: string | null = row?.prime_tier ?? null;
    const ageVerified = row?.age_verified === true || row?.age_verified === "t" || row?.age_verified === 1;
    const isAdmin = row?.is_admin === true || row?.is_admin === "t" || row?.is_admin === 1;
    const isDeveloper = row?.is_developer === true || row?.is_developer === "t" || row?.is_developer === 1;
    const isYoutubeCreator = row?.is_youtube_creator === true || row?.is_youtube_creator === "t" || row?.is_youtube_creator === 1;
    const isTiktokCreator = row?.is_tiktok_creator === true || row?.is_tiktok_creator === "t" || row?.is_tiktok_creator === 1;
    const isBot = row?.is_bot === true || row?.is_bot === "t" || row?.is_bot === 1;
    const popularity = 0;
    res.json({ ...user, nicknameStyle: row?.nickname_style ?? null, balance, hasPrime, primeTier, primeExpiresAt: row?.prime_expires_at ?? null, usernameChangedAt: row?.username_changed_at ?? null, ageVerified, isAdmin, isDeveloper, isYoutubeCreator, isTiktokCreator, popularity });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me/encryption-key", async (req, res) => {
  try {
    const publicKey = req.body?.publicKey;
    if (!publicKey || typeof publicKey !== "object") {
      return res.status(400).json({ error: "Некорректный публичный ключ" });
    }
    const serialized = JSON.stringify(publicKey);
    if (serialized.length > 4096 || publicKey.kty !== "EC" || publicKey.crv !== "P-256") {
      return res.status(400).json({ error: "Поддерживается только ключ ECDH P-256" });
    }
    await db.execute(sql`UPDATE users SET encryption_public_key = ${serialized} WHERE id = ${req.currentUserId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось сохранить ключ шифрования" });
  }
});

router.post("/users/me/prize-codes/redeem", async (req, res) => {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS prize_codes (
      id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, prize_amount INTEGER NOT NULL DEFAULT 1,
      prize_description TEXT, max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`);
    await db.execute(sql`ALTER TABLE prize_codes ADD COLUMN IF NOT EXISTS prize_type TEXT NOT NULL DEFAULT 'sparks'`);
    await db.execute(sql`ALTER TABLE prize_codes ADD COLUMN IF NOT EXISTS prime_months INTEGER`);
    await db.execute(sql`ALTER TABLE prize_codes ADD COLUMN IF NOT EXISTS nickname_style TEXT`);
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,40}$/.test(code)) return res.status(400).json({ error: "Введите корректный код" });
    const result = await db.transaction(async (tx) => {
      const codeRows = await tx.execute(sql`
        SELECT id, prize_amount, prize_description, prize_type, prime_months, nickname_style, max_uses, uses, expires_at
        FROM prize_codes WHERE code = ${code} FOR UPDATE
      `);
      const prize = codeRows.rows[0] as any;
      if (!prize) throw Object.assign(new Error("Код не найден"), { status: 404 });
      if (prize.expires_at && new Date(prize.expires_at).getTime() <= Date.now()) {
        throw Object.assign(new Error("Срок действия кода истёк"), { status: 410 });
      }
      if (Number(prize.uses) >= Number(prize.max_uses)) {
        throw Object.assign(new Error("Лимит использований этого кода исчерпан"), { status: 409 });
      }
      const redemption = await tx.execute(sql`
        INSERT INTO prize_code_redemptions (code_id, user_id) VALUES (${prize.id}, ${req.currentUserId})
        ON CONFLICT (code_id, user_id) DO NOTHING RETURNING id
      `);
      if (!redemption.rows.length) throw Object.assign(new Error("Вы уже использовали этот код"), { status: 409 });
      await tx.execute(sql`UPDATE prize_codes SET uses = uses + 1 WHERE id = ${prize.id}`);
      if (prize.prize_type === "prime") {
        await tx.execute(sql`
          UPDATE users SET has_prime = true, prime_tier = 'prime_plus',
            prime_expires_at = GREATEST(COALESCE(prime_expires_at, NOW()), NOW()) + make_interval(months => ${Math.min(24, Math.max(1, Number(prize.prime_months) || 1))})
          WHERE id = ${req.currentUserId}
        `);
      } else if (prize.prize_type === "nickname") {
        await tx.execute(sql`UPDATE users SET nickname_style = ${prize.nickname_style} WHERE id = ${req.currentUserId}`);
      } else {
        await tx.execute(sql`UPDATE users SET balance = COALESCE(balance, 0) + ${Number(prize.prize_amount)} WHERE id = ${req.currentUserId}`);
      }
      return { amount: prize.prize_type === "sparks" ? Number(prize.prize_amount) : 0, prizeType: prize.prize_type, primeMonths: prize.prime_months, nicknameStyle: prize.nickname_style, description: prize.prize_description };
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    if (status < 500) return res.status(status).json({ error: err.message });
    req.log.error(err);
    res.status(500).json({ error: "Не удалось активировать код" });
  }
});

router.get("/users/me/nickname-styles", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT ns.*, uns.id AS inventory_id, uns.source, uns.granted_at,
             (u.nickname_style = ns.slug) AS equipped
      FROM user_nickname_styles uns
      JOIN nickname_styles ns ON ns.id = uns.style_id
      JOIN users u ON u.id = uns.user_id
      WHERE uns.user_id = ${req.currentUserId}
      ORDER BY ns.sort_order, ns.id
    `);
    res.json(rows.rows);
  } catch { res.status(500).json({ error: "Не удалось загрузить инвентарь" }); }
});

router.post("/users/me/nickname-styles/:styleId/equip", async (req, res) => {
  try {
    const styleId = Number(req.params.styleId);
    const rows = await db.execute(sql`
      SELECT ns.slug FROM user_nickname_styles uns
      JOIN nickname_styles ns ON ns.id = uns.style_id
      WHERE uns.user_id = ${req.currentUserId} AND ns.id = ${styleId}
    `);
    if (!rows.rows.length) return res.status(403).json({ error: "Этого стиля нет в вашем инвентаре" });
    await db.execute(sql`UPDATE users SET nickname_style = ${(rows.rows[0] as any).slug} WHERE id = ${req.currentUserId}`);
    res.json({ success: true, nicknameStyle: (rows.rows[0] as any).slug });
  } catch { res.status(500).json({ error: "Не удалось надеть стиль" }); }
});

router.get("/users/me/creator-verifications", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT platform, submission_url, status, created_at
      FROM creator_verifications WHERE user_id = ${req.currentUserId}
      ORDER BY platform
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось загрузить задания" });
  }
});

router.post("/users/me/creator-verifications", async (req, res) => {
  try {
    const platform = String(req.body?.platform || "");
    const url = String(req.body?.submissionUrl || "").trim();
    const allowed = platform === "youtube" || platform === "tiktok";
    if (!allowed || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Укажите корректную ссылку на YouTube или TikTok" });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: "Ссылка имеет неверный формат" });
    }
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const validHost = platform === "youtube"
      ? hostname === "youtube.com" || hostname === "youtu.be" || hostname === "m.youtube.com"
      : hostname === "tiktok.com" || hostname === "vm.tiktok.com" || hostname === "m.tiktok.com";
    if (!validHost || !parsedUrl.pathname || parsedUrl.pathname === "/") {
      return res.status(400).json({
        error: platform === "youtube"
          ? "Нужна ссылка на конкретное публичное видео YouTube"
          : "Нужна ссылка на конкретный публичный ролик TikTok",
      });
    }
    await db.execute(sql`
      INSERT INTO creator_verifications (user_id, platform, submission_url, status)
      VALUES (${req.currentUserId}, ${platform}, ${url}, 'pending')
      ON CONFLICT (user_id, platform)
      DO UPDATE SET submission_url = EXCLUDED.submission_url, status = 'pending', created_at = NOW(), reviewed_at = NULL
    `);
    res.json({ success: true, status: "pending" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось отправить задание" });
  }
});

router.put("/users/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const raw = req.body as Record<string, unknown>;
    const body = UpdateMeBody.parse(req.body);
    const avatarUrl = typeof raw.avatarUrl === "string"
      ? raw.avatarUrl
      : typeof raw.avatar_url === "string"
        ? raw.avatar_url
        : body.avatarUrl;
    const statusText = typeof raw.statusText === "string"
      ? raw.statusText
      : typeof raw.status_text === "string"
        ? raw.status_text
        : body.statusText;
    const offloadedAvatarUrl = avatarUrl !== undefined ? await offloadDataUrl(avatarUrl, "avatars") : undefined;
    const updateData: Record<string, unknown> = { ...body };
    if (offloadedAvatarUrl !== undefined) updateData.avatarUrl = offloadedAvatarUrl;
    if (statusText !== undefined) updateData.statusText = statusText;
    const [updated] = await db.update(usersTable).set(updateData as any).where(eq(usersTable.id, uid)).returning();
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
    // Escape SQL LIKE special chars to prevent wildcard injection
    const escaped = q.replace(/[\\%_]/g, c => `\\${c}`);
    const users = await db.select().from(usersTable).where(
      or(
        sql`${usersTable.username} ILIKE ${"%" + escaped + "%"} ESCAPE '\\'`,
        sql`${usersTable.displayName} ILIKE ${"%" + escaped + "%"} ESCAPE '\\'`
      )
    ).limit(20);
    res.json(users);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId/encryption-key", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Некорректный userId" });
    const rows = await db.execute(sql`SELECT encryption_public_key FROM users WHERE id = ${userId} LIMIT 1`);
    if (!rows.rows.length) return res.status(404).json({ error: "Пользователь не найден" });
    const raw = (rows.rows[0] as any).encryption_public_key;
    res.json({ publicKey: raw ? JSON.parse(raw) : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось получить ключ шифрования" });
  }
});

router.get("/users/:userId", async (req, res) => {
  try {
    const requesterId = req.currentUserId;
    const userId = Number(req.params.userId);
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const popularity = 0;
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
    const { messagesTable, callsTable, chatMembersTable, contactsTable } = await import("@workspace/db");
    const { count, sum } = await import("drizzle-orm");

    const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.senderId, uid));
    const [callCount] = await db.select({ count: count() }).from(callsTable).where(eq(callsTable.callerId, uid));
    const [callDuration] = await db.select({ total: sum(callsTable.durationSeconds) }).from(callsTable).where(eq(callsTable.callerId, uid));
    const [chatsCount] = await db.select({ count: count() }).from(chatMembersTable).where(eq(chatMembersTable.userId, uid));
    const [contactsCount] = await db.select({ count: count() }).from(contactsTable).where(eq(contactsTable.userId, uid));

    const balanceRow = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((balanceRow.rows[0] as any)?.balance ?? 0);

    res.json({
      messagesSent: Number(msgCount?.count ?? 0),
      callsMade: Number(callCount?.count ?? 0),
      callDurationSeconds: Number(callDuration?.total ?? 0),
      giftsSent: 0,
      giftsReceived: 0,
      chatsCount: Number(chatsCount?.count ?? 0),
      contactsCount: Number(contactsCount?.count ?? 0),
      popularity: Math.min(balance, 10000),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Report a user
router.post("/users/:userId/report", async (req, res) => {
  try {
    const reporterId = req.currentUserId;
    if (!reporterId) return res.status(401).json({ error: "Unauthorized" });
    const targetId = Number(req.params.userId);
    if (!targetId || targetId === reporterId) return res.status(400).json({ error: "Invalid userId" });
    const { reason, details, imageUrl } = req.body as { reason: string; details?: string; imageUrl?: string };
    if (!reason) return res.status(400).json({ error: "Reason is required" });
    await db.execute(sql`ALTER TABLE user_reports ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
    await db.execute(sql`
      INSERT INTO user_reports (reporter_id, target_id, reason, details, image_url, created_at)
      VALUES (${reporterId}, ${targetId}, ${reason}, ${details ?? null}, ${imageUrl ?? null}, NOW())
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

// ── Block / unblock users ──────────────────────────────────────────────────
router.post("/users/:userId/block", async (req, res) => {
  try {
    const blockerId = req.currentUserId;
    if (!blockerId) return res.status(401).json({ error: "Unauthorized" });
    const blockedId = Number(req.params.userId);
    if (!blockedId || blockedId === blockerId) return res.status(400).json({ error: "Invalid userId" });
    await db.execute(sql`
      INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
      VALUES (${blockerId}, ${blockedId}, NOW())
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `);
    res.json({ ok: true, blocked: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:userId/block", async (req, res) => {
  try {
    const blockerId = req.currentUserId;
    if (!blockerId) return res.status(401).json({ error: "Unauthorized" });
    const blockedId = Number(req.params.userId);
    await db.execute(sql`
      DELETE FROM user_blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}
    `);
    res.json({ ok: true, blocked: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId/block", async (req, res) => {
  try {
    const blockerId = req.currentUserId;
    if (!blockerId) return res.status(401).json({ error: "Unauthorized" });
    const blockedId = Number(req.params.userId);
    const rows = await db.execute(sql`
      SELECT 1 FROM user_blocks WHERE blocker_id = ${blockerId} AND blocked_id = ${blockedId}
    `);
    res.json({ blocked: rows.rows.length > 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Email management from settings ────────────────────────────────────────

// In-memory cooldown: userId → last send timestamp
const emailChangeCooldowns = new Map<number, number>();
const EMAIL_CHANGE_COOLDOWN_MS = 60 * 1000;

// Set or change email — marks as unverified and sends OTP
router.put("/users/me/email", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rawEmail = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!rawEmail) return res.status(400).json({ error: "Email обязателен" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return res.status(400).json({ error: "Некорректный email" });
    }

    // Check email not taken by another user
    const taken = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${rawEmail} AND id != ${uid} LIMIT 1`);
    if (taken.rows.length > 0) return res.status(409).json({ error: "Этот email уже используется другим аккаунтом" });

    // Cooldown
    const lastSent = emailChangeCooldowns.get(uid) ?? 0;
    const waitMs = EMAIL_CHANGE_COOLDOWN_MS - (Date.now() - lastSent);
    if (waitMs > 0) return res.status(429).json({ error: `Подождите ${Math.ceil(waitMs / 1000)} сек` });

    if (!isMailerConfigured()) {
      // Save email without verification (mailer not set up)
      await db.execute(sql`UPDATE users SET email = ${rawEmail}, email_verified = false WHERE id = ${uid}`);
      return res.json({ success: true, codeSent: false, message: "Email сохранён (подтверждение недоступно)" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 30 * 60 * 1000);
    await db.execute(sql`
      UPDATE users
      SET email = ${rawEmail},
          email_verified = false,
          email_verification_code = ${code},
          email_verification_expires_at = ${expiry.toISOString()}
      WHERE id = ${uid}
    `);
    emailChangeCooldowns.set(uid, Date.now());
    sendVerificationEmail(rawEmail, code).catch(() => {});
    res.json({ success: true, codeSent: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Resend email verification code (from settings, user is authenticated)
router.post("/users/me/email/resend", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const lastSent = emailChangeCooldowns.get(uid) ?? 0;
    const waitMs = EMAIL_CHANGE_COOLDOWN_MS - (Date.now() - lastSent);
    if (waitMs > 0) return res.status(429).json({ error: `Подождите ${Math.ceil(waitMs / 1000)} сек` });

    const rows = await db.execute(sql`SELECT email, email_verified FROM users WHERE id = ${uid} LIMIT 1`);
    const user = rows.rows[0] as any;
    if (!user?.email) return res.status(400).json({ error: "Email не указан" });
    if (user.email_verified === true || user.email_verified === "t") return res.status(400).json({ error: "Email уже подтверждён" });
    if (!isMailerConfigured()) return res.status(503).json({ error: "Отправка писем временно недоступна" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 30 * 60 * 1000);
    await db.execute(sql`UPDATE users SET email_verification_code = ${code}, email_verification_expires_at = ${expiry.toISOString()} WHERE id = ${uid}`);
    emailChangeCooldowns.set(uid, Date.now());
    const sent = await sendVerificationEmail(String(user.email), code);
    if (!sent) return res.status(502).json({ error: "Не удалось отправить письмо" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Account deletion — purge all user data ─────────────────────────────────
router.delete("/users/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Введите пароль для подтверждения удаления" });

    const rows = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const valid = await import("bcryptjs").then(b => b.default.compare(String(password), user.password_hash || ""));
    if (!valid) return res.status(403).json({ error: "Неверный пароль" });

    // Purge all user data. Run each DELETE outside a transaction so a missing
    // table or foreign-key edge case doesn't abort the entire cleanup.
    const cleanupQueries = [
      sql`DELETE FROM user_sessions WHERE user_id = ${uid}`,
      sql`DELETE FROM message_reactions WHERE user_id = ${uid}`,
      sql`DELETE FROM story_views WHERE viewer_id = ${uid}`,
      sql`DELETE FROM stories WHERE user_id = ${uid}`,

      sql`DELETE FROM calls WHERE caller_id = ${uid} OR callee_id = ${uid}`,
      sql`DELETE FROM contacts WHERE user_id = ${uid} OR contact_id = ${uid}`,
      sql`DELETE FROM contact_requests WHERE from_user_id = ${uid} OR to_user_id = ${uid}`,
      sql`DELETE FROM user_blocks WHERE blocker_id = ${uid} OR blocked_id = ${uid}`,
      sql`DELETE FROM user_reports WHERE reporter_id = ${uid} OR target_id = ${uid}`,
      sql`DELETE FROM post_reports WHERE reporter_id = ${uid}`,
      sql`DELETE FROM referral_uses WHERE referrer_id = ${uid} OR referred_id = ${uid}`,
      sql`DELETE FROM push_subscriptions WHERE user_id = ${uid}`,
      sql`DELETE FROM fcm_tokens WHERE user_id = ${uid}`,
      sql`DELETE FROM chat_members WHERE user_id = ${uid}`,
      sql`DELETE FROM chat_folder_chats WHERE chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = ${uid})`,
      sql`DELETE FROM chat_folders WHERE user_id = ${uid}`,
      sql`DELETE FROM pinned_messages WHERE sender_id = ${uid}`,
      sql`DELETE FROM poll_votes WHERE user_id = ${uid}`,
      sql`DELETE FROM bug_reports WHERE user_id = ${uid}`,
      sql`DELETE FROM support_messages WHERE user_id = ${uid}`,
      sql`DELETE FROM support_tickets WHERE user_id = ${uid}`,
      // Nullify reply references so messages can be deleted safely
      sql`UPDATE messages SET reply_to_id = NULL WHERE reply_to_id IN (SELECT id FROM messages WHERE sender_id = ${uid})`,
      sql`DELETE FROM messages WHERE sender_id = ${uid}`,
      // Owned chats that have no other members left
      sql`DELETE FROM chats WHERE owner_id = ${uid} AND NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id = chats.id AND user_id != ${uid})`,
    ];
    for (const q of cleanupQueries) {
      await db.execute(q).catch((err) => req.log.warn({ err: String(err) }, "user deletion cleanup step warning"));
    }

    // Soft-delete the user account (anonymize data)
    await db.execute(sql`
      UPDATE users SET
        username = ${'deleted_' + uid},
        display_name = 'Deleted Account',
        bio = NULL,
        avatar_url = NULL,
        password_hash = '',
        is_banned = true,
        status = 'offline',
        phone_number = NULL,
        email = NULL,
        totp_secret = NULL,
        totp_enabled = false,
        security_question = NULL,
        security_answer = NULL,
        id_document_url = NULL,

        prime_tier = NULL,
        prime_expires_at = NULL
      WHERE id = ${uid}
    `);

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка при удалении аккаунта" });
  }
});

// ── Data export (GDPR/152-ФЗ right to access) ─────────────────────────────
router.get("/users/me/export", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const [userRows, msgRows, chatRows] = await Promise.all([
      db.execute(sql`SELECT id, username, display_name, bio, status, status_text, created_at FROM users WHERE id = ${uid}`),
      db.execute(sql`SELECT id, chat_id, text, type, created_at FROM messages WHERE sender_id = ${uid} ORDER BY created_at DESC LIMIT 1000`),
      db.execute(sql`SELECT c.id, c.name, c.type, cm.joined_at FROM chats c JOIN chat_members cm ON cm.chat_id = c.id WHERE cm.user_id = ${uid} ORDER BY cm.joined_at DESC LIMIT 200`),
    ]);
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: userRows.rows[0] || null,
      messages: msgRows.rows,
      chats: chatRows.rows,
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="nova-export-${uid}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка экспорта данных" });
  }
});

export default router;
