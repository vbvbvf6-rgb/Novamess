import { Router } from "express";
import { db, usersTable, messagesTable, chatsTable, chatMembersTable, callsTable, banwordsTable } from "@workspace/db";
import { eq, sql, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { moderateContent, localModerationCheck } from "../lib/moderation";
import { invalidateBanwordsCache, getBanwords, findBanword } from "../lib/banwords";
import { broadcastToAll } from "../lib/sse";

const router = Router();

const ADMIN_USER_IDS = [4];

// Run once at module load to ensure required columns/tables exist
db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});
db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`).catch(() => {});
db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP WITH TIME ZONE`).catch(() => {});
db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_scanned_at TIMESTAMP WITH TIME ZONE`).catch(() => {});
db.execute(sql`CREATE TABLE IF NOT EXISTS deleted_accounts (
  username TEXT PRIMARY KEY,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`).catch(() => {});
db.execute(sql`CREATE TABLE IF NOT EXISTS user_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`).catch(() => {});
db.execute(sql`CREATE TABLE IF NOT EXISTS post_reports (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  reporter_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`).catch(() => {});

db.execute(sql`CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)`).catch(() => {});

async function isAdminUser(userId: number): Promise<boolean> {
  if (ADMIN_USER_IDS.includes(userId)) return true;
  try {
    const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId}`);
    const user = rows.rows[0] as any;
    return !!user?.is_admin;
  } catch { return false; }
}

async function requireAdmin(req: any, res: any, next: any) {
  const ok = await isAdminUser(req.currentUserId);
  if (!ok) return res.status(403).json({ error: "Доступ запрещён" });
  next();
}

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, status, balance, created_at, is_verified, is_admin, is_bot, has_prime, is_banned, ban_reason, ban_expires_at FROM users ORDER BY id`
    );
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/give-currency", requireAdmin, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ error: "Укажите userId и amount (не равный нулю)" });
    }
    if (!Number.isInteger(amount) || amount < -1000000 || amount > 1000000) {
      return res.status(400).json({ error: "Сумма должна быть целым числом от -1 000 000 до 1 000 000" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${Number(userId)}`);
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${Number(userId)}`);
    const newBalance = Number((rows.rows[0] as any).balance);

    res.json({ success: true, userId: Number(userId), username: target.username, displayName: target.displayName, amount, newBalance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/set-balance", requireAdmin, async (req, res) => {
  try {
    const { userId, balance } = req.body;
    if (!userId || typeof balance !== "number" || balance < 0) {
      return res.status(400).json({ error: "Укажите userId и balance (≥0)" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    await db.execute(sql`UPDATE users SET balance = ${balance} WHERE id = ${Number(userId)}`);
    res.json({ success: true, userId: Number(userId), username: target.username, balance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/reset-password", requireAdmin, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: "Укажите userId и newPassword" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    const SALT_ROUNDS = 12;
    const newHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await db.execute(sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${Number(userId)}`);
    res.json({ success: true, message: `Пароль пользователя @${target.username} сброшен` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (!targetId || targetId === req.currentUserId) {
      return res.status(400).json({ error: "Нельзя удалить этого пользователя" });
    }
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) return res.status(400).json({ error: "Укажите причину удаления аккаунта" });

    await db.execute(sql`
      INSERT INTO deleted_accounts (username, reason, deleted_at)
      VALUES (${target.username}, ${reason}, NOW())
      ON CONFLICT (username) DO UPDATE SET reason = ${reason}, deleted_at = NOW()
    `).catch(() => {});

    // Delete in FK-safe order inside a transaction to prevent partial deletions
    // Pre-clean optional tables that may or may not exist (outside transaction)
    await db.execute(sql`DELETE FROM user_sessions WHERE user_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM user_reports WHERE reporter_id = ${targetId} OR target_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM post_reports WHERE reporter_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM contact_requests WHERE sender_id = ${targetId} OR receiver_id = ${targetId}`).catch(() => {});
    // Bot-related tables (may not exist on all deployments)
    await db.execute(sql`DELETE FROM bot_webhooks WHERE bot_user_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM bot_updates WHERE bot_user_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM bot_tokens WHERE bot_user_id = ${targetId} OR owner_user_id = ${targetId}`).catch(() => {});
    // Chat folders
    await db.execute(sql`DELETE FROM chat_folder_chats WHERE folder_id IN (SELECT id FROM chat_folders WHERE user_id = ${targetId})`).catch(() => {});
    await db.execute(sql`DELETE FROM chat_folders WHERE user_id = ${targetId}`).catch(() => {});
    // Referral/daily bonus/topup tables
    await db.execute(sql`DELETE FROM user_daily_bonus WHERE user_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM topup_requests WHERE user_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM spark_beg_requests WHERE from_user_id = ${targetId} OR to_user_id = ${targetId}`).catch(() => {});
    await db.execute(sql`DELETE FROM referrals WHERE referrer_id = ${targetId} OR referred_id = ${targetId}`).catch(() => {});

    await db.execute(sql`BEGIN`);
    try {
      await db.execute(sql`DELETE FROM reactions WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM poll_votes WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM spark_activity WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM pinned_messages WHERE pinned_by = ${targetId}`);
      await db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM bug_reports WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM scheduled_messages WHERE sender_id = ${targetId}`);
      await db.execute(sql`DELETE FROM contacts WHERE user_id = ${targetId} OR contact_id = ${targetId}`);
      await db.execute(sql`DELETE FROM story_views WHERE viewer_id = ${targetId}`);
      await db.execute(sql`DELETE FROM story_views WHERE story_id IN (SELECT id FROM stories WHERE user_id = ${targetId})`);
      await db.execute(sql`DELETE FROM stories WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM chat_members WHERE user_id = ${targetId}`);
      await db.execute(sql`UPDATE messages SET sender_id = NULL WHERE sender_id = ${targetId}`);
      await db.execute(sql`UPDATE calls SET caller_id = NULL WHERE caller_id = ${targetId}`);
      await db.execute(sql`UPDATE calls SET callee_id = NULL WHERE callee_id = ${targetId}`);
      await db.execute(sql`DELETE FROM post_likes WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM post_comments WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM moderation_appeals WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM posts WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM support_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = ${targetId})`);
      await db.execute(sql`DELETE FROM support_tickets WHERE user_id = ${targetId}`);
      await db.execute(sql`DELETE FROM users WHERE id = ${targetId}`);
      await db.execute(sql`COMMIT`);
    } catch (txErr) {
      await db.execute(sql`ROLLBACK`);
      throw txErr;
    }

    res.json({ success: true, message: `Пользователь @${target.username} удалён` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка удаления: " + (err as Error).message });
  }
});

router.post("/admin/set-verified", requireAdmin, async (req, res) => {
  try {
    const { userId, isVerified } = req.body;
    if (!userId) return res.status(400).json({ error: "Укажите userId" });
    await db.execute(sql`UPDATE users SET is_verified = ${!!isVerified} WHERE id = ${Number(userId)}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/set-admin", requireAdmin, async (req, res) => {
  try {
    const { userId, isAdmin } = req.body;
    if (!userId) return res.status(400).json({ error: "Укажите userId" });
    const targetId = Number(userId);
    if (ADMIN_USER_IDS.includes(targetId)) {
      return res.status(400).json({ error: "Нельзя изменить права суперадминистратора" });
    }
    await db.execute(sql`UPDATE users SET is_admin = ${!!isAdmin} WHERE id = ${targetId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Give/revoke Prime for a user
router.post("/admin/give-prime", requireAdmin, async (req, res) => {
  try {
    const { userId, give, months } = req.body;
    if (!userId) return res.status(400).json({ error: "Укажите userId" });
    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(userId)) });
    if (!target) return res.status(404).json({ error: "Пользователь не найден" });

    if (give === false) {
      await db.execute(sql`UPDATE users SET has_prime = false, prime_expires_at = NULL WHERE id = ${Number(userId)}`);
      res.json({ success: true, hasPrime: false, message: `Prime снят у @${target.username}` });
    } else {
      const m = Number(months) || 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + m);
      await db.execute(sql`UPDATE users SET has_prime = true, prime_tier = 'prime', prime_expires_at = ${expiresAt.toISOString()} WHERE id = ${Number(userId)}`);
      res.json({ success: true, hasPrime: true, primeExpiresAt: expiresAt.toISOString(), message: `Prime выдан @${target.username} на ${m} мес.` });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Mass-give SPARK to all users
router.post("/admin/mass-give", requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== "number" || amount === 0) {
      return res.status(400).json({ error: "Укажите amount (не равный нулю)" });
    }
    if (!Number.isInteger(amount) || Math.abs(amount) > 1000000) {
      return res.status(400).json({ error: "Сумма должна быть целым числом до ±1 000 000" });
    }
    await db.execute(sql`UPDATE users SET balance = GREATEST(0, balance + ${amount})`);
    const totals = await db.execute(sql`SELECT COUNT(*) as cnt, SUM(balance) as total FROM users`);
    const row = totals.rows[0] as any;
    res.json({ success: true, usersAffected: Number(row.cnt), newTotalSpark: Number(row.total || 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Per-user activity stats
router.get("/admin/users/:userId/stats", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    const [msgRow, callsRow] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls WHERE caller_id = ${targetId} OR callee_id = ${targetId}`),
    ]);
    res.json({
      messagesSent: Number((msgRow.rows[0] as any).cnt),
      callsTotal: Number((callsRow.rows[0] as any).cnt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Broadcast a message to all users via bot DM
router.post("/admin/broadcast", requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Укажите текст объявления" });

    // Find the bot by username (not hardcoded ID)
    const botRow = await db.execute(sql`SELECT id FROM users WHERE username = 'nova_ai' LIMIT 1`);
    const botId = (botRow.rows[0] as any)?.id;
    if (!botId) return res.status(404).json({ error: "Бот не найден. Перезапустите сервер для создания системных пользователей." });

    // Get all non-bot users
    const allUsers = await db.execute(sql`SELECT id FROM users WHERE is_bot = false`);

    let sent = 0;
    for (const userRow of allUsers.rows as any[]) {
      const userId = userRow.id;

      // Check if a direct chat between bot and user already exists
      const existingChat = await db.execute(
        sql`SELECT c.id FROM chats c
            JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = ${botId}
            JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = ${userId}
            WHERE c.type = 'direct' LIMIT 1`
      );

      let chatId: number;
      if ((existingChat.rows as any[]).length > 0) {
        chatId = (existingChat.rows[0] as any).id;
      } else {
        // Create direct chat between bot and user
        const newChat = await db.execute(
          sql`INSERT INTO chats (type, created_at, updated_at) VALUES ('direct', NOW(), NOW()) RETURNING id`
        );
        chatId = (newChat.rows[0] as any).id;
        await db.execute(
          sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES
              (${chatId}, ${botId}, 'member', NOW()),
              (${chatId}, ${userId}, 'member', NOW())`
        );
      }

      // Insert the announcement message (column is "text" not "content")
      await db.execute(
        sql`INSERT INTO messages (chat_id, sender_id, type, text, created_at, updated_at)
            VALUES (${chatId}, ${botId}, 'text', ${String(text).trim()}, NOW(), NOW())`
      );
      await db.execute(sql`UPDATE chats SET updated_at = NOW() WHERE id = ${chatId}`);
      sent++;
    }

    res.json({ success: true, chatsSent: sent, message: `Объявление отправлено ${sent} пользователям` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Edit user profile (display name, bio)
router.patch("/admin/users/:userId", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    const { displayName, bio } = req.body;
    if (!displayName && bio === undefined) return res.status(400).json({ error: "Нечего обновлять" });

    if (displayName) await db.execute(sql`UPDATE users SET display_name = ${displayName} WHERE id = ${targetId}`);
    if (bio !== undefined) await db.execute(sql`UPDATE users SET bio = ${bio} WHERE id = ${targetId}`);

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Posts moderation
router.get("/admin/posts", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT p.id, p.text, p.image_url, p.likes_count, p.comments_count, p.created_at,
                u.id as user_id, u.username, u.display_name, u.avatar_color, u.avatar_url
          FROM posts p
          LEFT JOIN users u ON u.id = p.user_id
          ORDER BY p.created_at DESC LIMIT 100`
    );
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/admin/posts/:postId", requireAdmin, async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    await db.execute(sql`DELETE FROM post_comments WHERE post_id = ${postId}`);
    await db.execute(sql`DELETE FROM post_likes WHERE post_id = ${postId}`);
    await db.execute(sql`DELETE FROM posts WHERE id = ${postId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Leaderboard
router.get("/admin/leaderboard", requireAdmin, async (req, res) => {
  try {
    const [byBalance, byMessages] = await Promise.all([
      db.execute(sql`SELECT id, username, display_name, avatar_color, avatar_url, balance as score FROM users WHERE is_bot = false ORDER BY balance DESC LIMIT 5`),
      db.execute(sql`SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, COUNT(m.id)::int as score FROM users u LEFT JOIN messages m ON m.sender_id = u.id WHERE u.is_bot = false GROUP BY u.id ORDER BY score DESC LIMIT 5`),
    ]);
    res.json({ byBalance: byBalance.rows, byMessages: byMessages.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Ban / Unban
router.post("/admin/users/:userId/ban", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (targetId === req.currentUserId) return res.status(400).json({ error: "Нельзя забанить себя" });
    const { ban, reason, durationHours } = req.body;
    if (ban) {
      const expiresAt = durationHours ? new Date(Date.now() + Number(durationHours) * 3600_000).toISOString() : null;
      await db.execute(sql`UPDATE users SET is_banned = true, ban_reason = ${reason?.trim() || null}, ban_expires_at = ${expiresAt} WHERE id = ${targetId}`);
    } else {
      await db.execute(sql`UPDATE users SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL WHERE id = ${targetId}`);
    }
    const target = await db.execute(sql`SELECT username, is_banned, ban_reason, ban_expires_at FROM users WHERE id = ${targetId}`);
    const row = target.rows[0] as any;
    // Kick the user in real-time via SSE if they are currently logged in
    if (ban) {
      broadcastToAll("banned", {
        userId: targetId,
        banReason: reason?.trim() || null,
        banExpiresAt: durationHours ? new Date(Date.now() + Number(durationHours) * 3600_000).toISOString() : null,
      });
    }
    res.json({
      success: true,
      isBanned: row?.is_banned ?? !!ban,
      banReason: row?.ban_reason ?? null,
      banExpiresAt: row?.ban_expires_at ?? null,
      message: ban ? `@${row?.username} заблокирован${durationHours ? ` на ${durationHours} ч.` : " навсегда"}` : `@${row?.username} разблокирован`,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Database usage / storage monitoring ────────────────────────────────────
router.get("/admin/database-usage", requireAdmin, async (req, res) => {
  try {
    const totalRow = await db.execute(sql`SELECT pg_database_size(current_database()) AS bytes`);
    const totalBytes = Number((totalRow.rows[0] as any).bytes);

    const tablesRow = await db.execute(sql`
      SELECT relname AS table, pg_total_relation_size(relid) AS bytes, n_live_tup AS row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 12
    `);
    const tables = (tablesRow.rows as any[]).map(r => ({
      name: r.table,
      sizeMb: Math.round((Number(r.bytes) / (1024 * 1024)) * 100) / 100,
      rowCount: Number(r.row_count),
    }));

    // Replit's free Postgres tier caps storage around 10 GB — shown as a soft reference limit.
    const limitBytes = 10 * 1024 * 1024 * 1024;

    res.json({
      totalMb: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
      limitMb: Math.round(limitBytes / (1024 * 1024)),
      percentUsed: Math.min(100, Math.round((totalBytes / limitBytes) * 1000) / 10),
      tables,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Cleanup: purge expired stories & old sent scheduled messages to reclaim space
router.post("/admin/database-cleanup", requireAdmin, async (req, res) => {
  try {
    const expiredStories = await db.execute(sql`DELETE FROM stories WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id`);
    const oldScheduled = await db.execute(sql`DELETE FROM scheduled_messages WHERE sent_at IS NOT NULL AND sent_at < NOW() - INTERVAL '7 days' RETURNING id`).catch(() => ({ rows: [] }));
    res.json({
      success: true,
      deletedStories: (expiredStories.rows as any[]).length,
      deletedScheduled: (oldScheduled.rows as any[]).length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Moderation Appeals ────────────────────────────────────────────────────────

router.get("/admin/moderation/appeals", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        ma.id, ma.post_id, ma.user_id, ma.appeal_text, ma.status,
        ma.admin_response, ma.created_at, ma.resolved_at,
        p.text AS post_text, p.image_url AS post_image_url,
        p.moderation_reason, p.moderation_confidence, p.moderation_categories,
        u.username, u.display_name, u.avatar_color, u.avatar_url
      FROM moderation_appeals ma
      JOIN posts p ON p.id = ma.post_id
      JOIN users u ON u.id = ma.user_id
      ORDER BY
        CASE ma.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        ma.created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/moderation/appeals/:id/approve", requireAdmin, async (req, res) => {
  try {
    const appealId = Number(req.params.id);
    const { adminResponse } = req.body;

    const rows = await db.execute(sql`SELECT * FROM moderation_appeals WHERE id = ${appealId}`);
    const appeal = rows.rows[0] as any;
    if (!appeal) return res.status(404).json({ error: "Апелляция не найдена" });
    if (appeal.status !== 'pending') return res.status(400).json({ error: "Апелляция уже обработана" });

    await db.execute(sql`
      UPDATE moderation_appeals SET status = 'approved', admin_response = ${adminResponse || null}, resolved_at = NOW()
      WHERE id = ${appealId}
    `);
    await db.execute(sql`
      UPDATE posts SET moderation_status = 'approved', moderation_reason = NULL
      WHERE id = ${appeal.post_id}
    `);

    res.json({ success: true, message: "Апелляция одобрена, пост восстановлен" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/moderation/appeals/:id/reject", requireAdmin, async (req, res) => {
  try {
    const appealId = Number(req.params.id);
    const { adminResponse } = req.body;

    const rows = await db.execute(sql`SELECT * FROM moderation_appeals WHERE id = ${appealId}`);
    const appeal = rows.rows[0] as any;
    if (!appeal) return res.status(404).json({ error: "Апелляция не найдена" });
    if (appeal.status !== 'pending') return res.status(400).json({ error: "Апелляция уже обработана" });

    await db.execute(sql`
      UPDATE moderation_appeals SET status = 'rejected', admin_response = ${adminResponse || null}, resolved_at = NOW()
      WHERE id = ${appealId}
    `);

    res.json({ success: true, message: "Апелляция отклонена" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Support Admin Routes ──────────────────────────────────────────────────────

router.get("/admin/support/bugs", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT br.id, br.title, br.description, br.category, br.status,
             br.platform_info, br.screenshot_url, br.admin_note,
             br.created_at, br.resolved_at,
             u.username, u.display_name, u.avatar_color, u.avatar_url
      FROM bug_reports br
      JOIN users u ON u.id = br.user_id
      ORDER BY
        CASE br.status WHEN 'new' THEN 0 WHEN 'acknowledged' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,
        br.created_at DESC
      LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/admin/support/bugs/:id", requireAdmin, async (req, res) => {
  try {
    const bugId = Number(req.params.id);
    const { status, adminNote } = req.body;
    const validStatuses = ['new', 'acknowledged', 'in_progress', 'resolved', 'closed'];
    if (status && !validStatuses.includes(status)) return res.status(400).json({ error: "Неверный статус" });

    if (status) {
      if (status === 'resolved' || status === 'closed') {
        await db.execute(sql`UPDATE bug_reports SET status = ${status}, admin_note = COALESCE(${adminNote ?? null}, admin_note), resolved_at = NOW() WHERE id = ${bugId}`);
      } else {
        await db.execute(sql`UPDATE bug_reports SET status = ${status}, admin_note = COALESCE(${adminNote ?? null}, admin_note) WHERE id = ${bugId}`);
      }
    } else {
      await db.execute(sql`UPDATE bug_reports SET admin_note = COALESCE(${adminNote ?? null}, admin_note) WHERE id = ${bugId}`);
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/admin/support/bugs/:id", requireAdmin, async (req, res) => {
  try {
    const bugId = Number(req.params.id);
    if (!bugId) return res.status(400).json({ error: "Неверный id" });
    await db.execute(sql`DELETE FROM bug_reports WHERE id = ${bugId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/support/tickets", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT t.id, t.subject, t.status, t.created_at, t.updated_at,
             u.username, u.display_name, u.avatar_color, u.avatar_url,
             (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
             (SELECT text FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT is_admin FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_is_admin
      FROM support_tickets t
      JOIN users u ON u.id = t.user_id
      ORDER BY
        CASE t.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 WHEN 'answered' THEN 2 ELSE 3 END,
        t.updated_at DESC
      LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/support/tickets/:ticketId", requireAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const ticketRow = await db.execute(sql`
      SELECT t.*, u.username, u.display_name, u.avatar_color, u.avatar_url
      FROM support_tickets t JOIN users u ON u.id = t.user_id
      WHERE t.id = ${ticketId}
    `);
    const ticket = ticketRow.rows[0] as any;
    if (!ticket) return res.status(404).json({ error: "Не найден" });

    const msgRows = await db.execute(sql`
      SELECT sm.id, sm.is_admin, sm.text, sm.created_at, sm.user_id,
        u.display_name, u.avatar_color, u.avatar_url
      FROM support_messages sm
      LEFT JOIN users u ON u.id = sm.user_id
      WHERE sm.ticket_id = ${ticketId}
      ORDER BY sm.created_at ASC
    `);
    res.json({ ...ticket, messages: msgRows.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/support/tickets/:ticketId/reply", requireAdmin, async (req, res) => {
  try {
    const adminId = req.currentUserId;
    const ticketId = Number(req.params.ticketId);
    const { text, closeTicket } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "text обязателен" });

    const ticketRow = await db.execute(sql`SELECT id FROM support_tickets WHERE id = ${ticketId}`);
    if (!(ticketRow.rows as any[]).length) return res.status(404).json({ error: "Тикет не найден" });

    await db.execute(sql`
      INSERT INTO support_messages (ticket_id, user_id, is_admin, text)
      VALUES (${ticketId}, ${adminId}, true, ${text.trim()})
    `);

    const newStatus = closeTicket ? 'closed' : 'answered';
    await db.execute(sql`UPDATE support_tickets SET status = ${newStatus}, updated_at = NOW() WHERE id = ${ticketId}`);

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/admin/support/tickets/:ticketId/status", requireAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.ticketId);
    const { status } = req.body;
    const valid = ['open', 'pending', 'answered', 'closed'];
    if (!valid.includes(status)) return res.status(400).json({ error: "Неверный статус" });
    await db.execute(sql`UPDATE support_tickets SET status = ${status}, updated_at = NOW() WHERE id = ${ticketId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/age-verifications", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, username, display_name, avatar_color, avatar_url, birth_date, id_document_url, age_verified, age_group, created_at
      FROM users
      WHERE id_document_url IS NOT NULL AND is_bot = false
      ORDER BY CASE WHEN age_verified = false THEN 0 ELSE 1 END, created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/age-verifications/:userId/approve", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    await db.execute(sql`UPDATE users SET age_verified = true WHERE id = ${targetId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/age-verifications/:userId/reject", requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    await db.execute(sql`UPDATE users SET age_verified = false, id_document_url = NULL WHERE id = ${targetId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Chat Management ───────────────────────────────────────────────────────────

router.get("/admin/chats", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.type, c.name, c.avatar_color, c.avatar_url, c.created_at,
             COUNT(cm.user_id)::int AS member_count,
             (SELECT COUNT(*)::int FROM messages m WHERE m.chat_id = c.id) AS message_count
      FROM chats c
      LEFT JOIN chat_members cm ON cm.chat_id = c.id
      WHERE c.type IN ('group', 'channel')
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 200
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/admin/chats/:chatId", requireAdmin, async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    if (!chatId) return res.status(400).json({ error: "Неверный chatId" });
    await db.execute(sql`DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE chat_id = ${chatId})`);
    await db.execute(sql`DELETE FROM messages WHERE chat_id = ${chatId}`);
    await db.execute(sql`DELETE FROM chat_members WHERE chat_id = ${chatId}`);
    await db.execute(sql`DELETE FROM chats WHERE id = ${chatId}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Broadcast Push Notification ───────────────────────────────────────────────

router.get("/admin/check", async (req, res) => {
  try {
    const ok = await isAdminUser(req.currentUserId);
    res.json({ isAdmin: ok });
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Weekly AI Auto-Review Scan ────────────────────────────────────────────────

router.get("/admin/moderation/scan-status", requireAdmin, async (req, res) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moderation_scan_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMP WITH TIME ZONE,
        posts_scanned INTEGER NOT NULL DEFAULT 0,
        posts_flagged INTEGER NOT NULL DEFAULT 0,
        triggered_by TEXT NOT NULL DEFAULT 'scheduler',
        status TEXT NOT NULL DEFAULT 'running'
      )
    `);
    const [runRows, unreviewedRows, totalFlaggedRows] = await Promise.all([
      db.execute(sql`SELECT * FROM moderation_scan_runs ORDER BY started_at DESC LIMIT 10`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM posts WHERE moderation_scanned_at IS NULL AND moderation_status IS NULL`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM posts WHERE moderation_status = 'rejected'`),
    ]);

    res.json({
      runs: runRows.rows,
      unreviewedCount: Number((unreviewedRows.rows[0] as any)?.cnt || 0),
      totalFlaggedCount: Number((totalFlaggedRows.rows[0] as any)?.cnt || 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

let scanInProgress = false;

router.post("/admin/moderation/trigger-scan", requireAdmin, async (req, res) => {
  if (scanInProgress) {
    return res.status(409).json({ error: "Сканирование уже выполняется" });
  }
  try {
    const [runResult] = (await db.execute(sql`
      INSERT INTO moderation_scan_runs (triggered_by, status)
      VALUES ('admin', 'running')
      RETURNING id
    `)).rows as any[];
    const runId = runResult.id;

    res.json({ success: true, runId, message: "Сканирование запущено в фоне" });

    setImmediate(() => runWeeklyScan(runId, "admin"));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export async function runWeeklyScan(runId: number, triggeredBy: string = "scheduler"): Promise<void> {
  if (scanInProgress) return;
  scanInProgress = true;
  let scanned = 0;
  let flagged = 0;
  try {
    const unreviewed = await db.execute(sql`
      SELECT id, text FROM posts
      WHERE moderation_scanned_at IS NULL AND moderation_status IS NULL AND text IS NOT NULL AND LENGTH(TRIM(text)) >= 5
      ORDER BY id ASC
      LIMIT 500
    `);

    for (const row of unreviewed.rows as any[]) {
      try {
        const result = await moderateContent(row.text);
        scanned++;

        if (result.flagged && result.confidence >= 40) {
          flagged++;
          await db.execute(sql`
            UPDATE posts SET
              moderation_status = 'rejected',
              moderation_reason = ${result.reason || 'Контент нарушает правила сообщества'},
              moderation_confidence = ${result.confidence},
              moderation_categories = ${JSON.stringify(result.categories)},
              moderation_scanned_at = NOW()
            WHERE id = ${row.id}
          `);
        } else {
          await db.execute(sql`
            UPDATE posts SET moderation_scanned_at = NOW() WHERE id = ${row.id}
          `);
        }
        await new Promise(r => setTimeout(r, 300));
      } catch {}
    }

    await db.execute(sql`
      UPDATE moderation_scan_runs
      SET finished_at = NOW(), posts_scanned = ${scanned}, posts_flagged = ${flagged}, status = 'completed'
      WHERE id = ${runId}
    `);
  } catch (err) {
    try {
      await db.execute(sql`
        UPDATE moderation_scan_runs
        SET finished_at = NOW(), posts_scanned = ${scanned}, posts_flagged = ${flagged}, status = 'failed'
        WHERE id = ${runId}
      `);
    } catch {}
  } finally {
    scanInProgress = false;
  }
}

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [totals, msgs, chts, calls] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total_users, SUM(balance) as total_spark, SUM(CASE WHEN has_prime THEN 1 ELSE 0 END) as prime_users FROM users`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM chats`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls`),
    ]);
    const row = totals.rows[0] as any;
    res.json({
      totalUsers: Number(row.total_users),
      totalSpark: Number(row.total_spark || 0),
      primeUsers: Number(row.prime_users || 0),
      totalMessages: Number((msgs.rows[0] as any).cnt),
      totalChats: Number((chts.rows[0] as any).cnt),
      totalCalls: Number((calls.rows[0] as any).cnt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

/* ── Banwords ──────────────────────────────────────────────────── */

router.get("/admin/banwords", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT id, word, created_at FROM banwords ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/banwords/bulk", requireAdmin, async (req, res) => {
  try {
    const raw = String(req.body.words ?? "");
    const words = raw
      .split(/[\n,;]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2 && w.length <= 100);

    if (words.length === 0) return res.status(400).json({ error: "Нет слов для добавления" });
    if (words.length > 1000) return res.status(400).json({ error: "Максимум 1000 слов за раз" });

    let added = 0;
    let skipped = 0;
    for (const word of words) {
      try {
        const result = await db.execute(
          sql`INSERT INTO banwords (word, created_by) VALUES (${word}, ${req.currentUserId}) ON CONFLICT (word) DO NOTHING`
        );
        if ((result as any).rowCount > 0) added++;
        else skipped++;
      } catch { skipped++; }
    }
    invalidateBanwordsCache();
    res.json({ added, skipped, total: words.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/banwords", requireAdmin, async (req, res) => {
  try {
    const word = String(req.body.word ?? "").trim().toLowerCase();
    if (!word) return res.status(400).json({ error: "Введите слово" });
    const existing = await db.execute(sql`SELECT id FROM banwords WHERE word = ${word}`);
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Слово уже в списке" });
    }
    const [row] = await db.insert(banwordsTable).values({
      word,
      createdBy: req.currentUserId,
    }).returning();
    invalidateBanwordsCache();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/admin/banwords/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute(sql`DELETE FROM banwords WHERE id = ${id}`);
    invalidateBanwordsCache();
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Hardcoded comprehensive profanity preset (RU + EN)
const PRESET_BANWORDS = [
  // Russian mat
  "хуй","хуя","хуе","хую","хуям","хуйня","хуйло","нахуй","похуй","захуярить",
  "пизда","пизды","пизде","пизду","пиздец","пиздить","пиздёж","пиздун","пиздюк","пиздобол",
  "блядь","бляди","блядский","бляд","блять","бля",
  "ебать","ебал","ебаный","ёбаный","еблан","ёблан","ёб","ёбать","ебись",
  "сука","суки","сучка","сучара",
  "мудак","мудила","мудозвон","муде",
  "пидор","пидарас","пидрила","пидр",
  "залупа","дрочить","дрочун","дрочер",
  "гондон","гандон",
  "шлюха","шлюхи","шалава","шалавы","курва","курвы",
  "ублюдок","ублюдки",
  "долбоёб","долбоеб",
  "хуесос","залупоед",
  "мразь","мрази",
  "падла","падлюка",
  "чмо","чмошник","чмошники",
  "охуеть","охуел","охуела","охуели",
  "выблядок","выблядки",
  "пиздюк","пиздюки",
  "ёбаная","ёбаный",
  "иди нахуй","пошёл нахуй","иди в пизду",
  // English
  "fuck","fucker","fucking","fucked","fucks","motherfucker","motherfucking",
  "shit","shits","shitty","bullshit","horseshit",
  "asshole","assholes","ass","asses",
  "bitch","bitches","bitching",
  "cunt","cunts",
  "dick","dicks","dickhead","dickheads",
  "cock","cocks","cocksucker",
  "pussy","pussies",
  "whore","whores",
  "nigger","niggers","nigga","niggas",
  "faggot","faggots","fag","fags",
  "bastard","bastards",
  "slut","slutty","sluts",
  "retard","retarded","retards",
  "damn","goddamn","damnit",
  "prick","pricks",
  "twat","twats",
  "wanker","wankers",
];

router.post("/admin/banwords/import-from-web", requireAdmin, async (req, res) => {
  try {
    let fetchedWords: string[] = [];
    // Try to fetch from LDNOOBW public GitHub list (RU + EN)
    try {
      const [ruRes, enRes] = await Promise.allSettled([
        fetch("https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/ru", {
          signal: AbortSignal.timeout(6000),
        }),
        fetch("https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en", {
          signal: AbortSignal.timeout(6000),
        }),
      ]);
      if (ruRes.status === "fulfilled" && ruRes.value.ok) {
        const text = await ruRes.value.text();
        fetchedWords.push(...text.split("\n").map(w => w.trim().toLowerCase()).filter(w => w.length >= 2 && !w.startsWith("#")));
      }
      if (enRes.status === "fulfilled" && enRes.value.ok) {
        const text = await enRes.value.text();
        fetchedWords.push(...text.split("\n").map(w => w.trim().toLowerCase()).filter(w => w.length >= 2 && !w.startsWith("#")));
      }
    } catch {}

    const allWords = [...new Set([...PRESET_BANWORDS, ...fetchedWords])]
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2);

    let added = 0;
    // Batch insert, ignore duplicates via ON CONFLICT
    for (const word of allWords) {
      try {
        const result = await db.execute(
          sql`INSERT INTO banwords (word, created_by) VALUES (${word}, ${req.currentUserId}) ON CONFLICT (word) DO NOTHING`
        );
        if ((result as any).rowCount > 0) added++;
      } catch {}
    }

    invalidateBanwordsCache();
    res.json({ added, total: allWords.length, fromInternet: fetchedWords.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка при импорте" });
  }
});

router.post("/admin/banwords/scan-messages", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.body?.limit ?? 300), 1000);
    const rows = await db.execute(sql`
      SELECT m.id, m.text, m.chat_id, m.sender_id, m.created_at,
        u.display_name, u.username, u.avatar_color, u.avatar_url
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.text IS NOT NULL AND m.text != '' AND (m.is_deleted = false OR m.is_deleted IS NULL)
      ORDER BY m.created_at DESC
      LIMIT ${limit}
    `);

    const banwords = await getBanwords();
    const flagged: any[] = [];

    for (const row of (rows.rows as any[])) {
      const text = String(row.text || "");
      if (text.length < 2) continue;
      const hit = findBanword(text, banwords);
      const localResult = hit ? null : (text.length >= 5 ? localModerationCheck(text) : null);
      if (hit || localResult?.flagged) {
        flagged.push({
          id: row.id,
          text: text.slice(0, 300),
          chatId: row.chat_id,
          senderId: row.sender_id,
          senderName: row.display_name || row.username,
          senderUsername: row.username,
          avatarColor: row.avatar_color,
          avatarUrl: row.avatar_url,
          createdAt: row.created_at,
          reason: hit ? `Бан-слово: «${hit}»` : (localResult?.reason ?? "Нарушение правил"),
          categories: hit ? ["custom_banned"] : (localResult?.categories ?? []),
        });
      }
    }

    res.json({ scanned: (rows.rows as any[]).length, flagged });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка при сканировании" });
  }
});

router.delete("/admin/banwords/scan-delete/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute(sql`UPDATE messages SET is_deleted = true WHERE id = ${id}`);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

/* ── User Reports ──────────────────────────────────────────────── */

router.get("/admin/user-reports", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT ur.id, ur.reason, ur.details, ur.status, ur.created_at,
        r.id AS reporter_id, r.display_name AS reporter_name, r.username AS reporter_username,
        t.id AS target_id, t.display_name AS target_name, t.username AS target_username
      FROM user_reports ur
      JOIN users r ON r.id = ur.reporter_id
      JOIN users t ON t.id = ur.target_id
      ORDER BY ur.created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/user-reports/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status: string };
    await db.execute(sql`UPDATE user_reports SET status = ${status}, reviewed_at = NOW() WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Banned Words ──────────────────────────────────────────────────────────── */

async function ensureBannedWordsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS banned_words (
      id SERIAL PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'custom',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

router.get("/admin/banned-words", requireAdmin, async (req, res) => {
  try {
    await ensureBannedWordsTable();
    const rows = await db.execute(sql`SELECT id, word, category, created_at FROM banned_words ORDER BY created_at DESC`);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/banned-words", requireAdmin, async (req, res) => {
  try {
    await ensureBannedWordsTable();
    const { word, category } = req.body as { word: string; category?: string };
    if (!word?.trim()) return res.status(400).json({ error: "Word required" });
    const clean = word.trim().toLowerCase();
    await db.execute(sql`
      INSERT INTO banned_words (word, category, created_by)
      VALUES (${clean}, ${category || "custom"}, ${req.currentUserId})
      ON CONFLICT (word) DO NOTHING
    `);
    const result = await db.execute(sql`SELECT id, word, category, created_at FROM banned_words WHERE word = ${clean}`);
    res.status(201).json(result.rows[0] || { word: clean, category: category || "custom" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/banned-words/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.execute(sql`DELETE FROM banned_words WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public route used by moderation service at post-time
router.get("/admin/banned-words/list", requireAdmin, async (req, res) => {
  try {
    await ensureBannedWordsTable();
    const rows = await db.execute(sql`SELECT word FROM banned_words`);
    res.json((rows.rows as any[]).map(r => r.word));
  } catch {
    res.json([]);
  }
});

// ── Maintenance mode (public read, admin write) ────────────────────────────

router.get("/maintenance", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'maintenance' LIMIT 1`);
    const row = rows.rows[0] as any;
    if (!row) return res.json({ active: false });
    const data = JSON.parse(row.value);
    // Auto-expire if end time has passed
    if (data.active && data.endsAt && new Date(data.endsAt) < new Date()) {
      data.active = false;
      await db.execute(sql`UPDATE app_settings SET value = ${JSON.stringify(data)}, updated_at = NOW() WHERE key = 'maintenance'`).catch(() => {});
    }
    return res.json(data);
  } catch { return res.json({ active: false }); }
});

router.get("/admin/maintenance", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'maintenance' LIMIT 1`);
    const row = rows.rows[0] as any;
    if (!row) return res.json({ active: false, message: "", fixes: [], endsAt: null });
    return res.json(JSON.parse(row.value));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Ошибка сервера" }); }
});

router.post("/admin/maintenance", requireAdmin, async (req, res) => {
  try {
    const { active, message, fixes, endsAt } = req.body;
    const data = {
      active: !!active,
      message: String(message || "").trim(),
      fixes: Array.isArray(fixes) ? fixes.map(String).filter(Boolean) : [],
      endsAt: endsAt || null,
    };
    const json = JSON.stringify(data);
    await db.execute(sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ('maintenance', ${json}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${json}, updated_at = NOW()
    `);
    // Broadcast to all connected clients so the overlay appears immediately
    // without waiting for the 15-second poll. Admins handle it on the frontend.
    broadcastToAll("maintenance", data);
    return res.json({ ok: true, data });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Ошибка сервера" }); }
});

// ── Admin mail diagnostics ─────────────────────────────────────────────────

router.get("/admin/mail-test", requireAdmin, async (req, res) => {
  const apiKey = process.env.ELASTICEMAIL_API_KEY;
  const from   = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "(не задан)";
  const providerNote = apiKey ? "Elastic Email" : process.env.BREVO_API_KEY ? "Brevo" : process.env.SMTP_HOST ? "SMTP" : "none";

  if (!apiKey) {
    return res.json({ ok: false, provider: providerNote, from, reason: "ELASTICEMAIL_API_KEY не задан" });
  }

  const to = String(req.query.to || from);
  const params = new URLSearchParams({
    apikey: apiKey,
    from,
    fromName: process.env.MAIL_FROM_NAME || "Nova",
    to,
    subject: "Nova — тест отправки письма",
    bodyText: "Если вы видите это письмо — email работает!",
    bodyHtml: "<p>Если вы видите это письмо — <b>email работает!</b></p>",
    isTransactional: "true",
  });

  try {
    const r = await fetch("https://api.elasticemail.com/v2/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = (await r.json().catch(() => ({}))) as any;
    return res.json({ ok: json?.success === true, provider: "Elastic Email", status: r.status, from, to, elasticResponse: json });
  } catch (err: any) {
    return res.json({ ok: false, provider: "Elastic Email", from, to, error: err?.message });
  }
});

export default router;
