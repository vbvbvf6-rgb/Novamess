import { Router } from "express";
import { db, usersTable, messagesTable, chatsTable, chatMembersTable, giftsTable, callsTable } from "@workspace/db";
import { eq, sql, ne } from "drizzle-orm";
import { createHash } from "node:crypto";

const router = Router();

const ADMIN_USER_IDS = [4];
const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

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
      sql`SELECT id, username, display_name, avatar_color, avatar_url, status, balance, created_at, is_verified, is_admin, is_bot, has_prime FROM users ORDER BY id`
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
    if (!userId || typeof amount !== "number") {
      return res.status(400).json({ error: "Укажите userId и amount" });
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

    await db.execute(sql`UPDATE users SET password_hash = ${hash(String(newPassword))} WHERE id = ${Number(userId)}`);
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

    await db.execute(sql`DELETE FROM contacts WHERE user_id = ${targetId} OR contact_id = ${targetId}`);
    await db.execute(sql`DELETE FROM story_views WHERE viewer_id = ${targetId}`);
    await db.execute(sql`DELETE FROM story_views WHERE story_id IN (SELECT id FROM stories WHERE user_id = ${targetId})`);
    await db.execute(sql`DELETE FROM stories WHERE user_id = ${targetId}`);
    await db.execute(sql`DELETE FROM chat_members WHERE user_id = ${targetId}`);
    await db.execute(sql`UPDATE messages SET sender_id = NULL WHERE sender_id = ${targetId}`);
    await db.execute(sql`DELETE FROM gifts WHERE sender_id = ${targetId} OR receiver_id = ${targetId}`);
    await db.execute(sql`UPDATE calls SET caller_id = ${targetId} WHERE caller_id = ${targetId}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${targetId}`);

    res.json({ success: true, message: `Пользователь @${target.username} удалён` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
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
      await db.execute(sql`UPDATE users SET has_prime = true, prime_expires_at = ${expiresAt.toISOString()} WHERE id = ${Number(userId)}`);
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
      return res.status(400).json({ error: "Укажите amount" });
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
    const [msgRow, giftsSentRow, giftsRecvRow, callsRow] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts WHERE sender_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts WHERE receiver_id = ${targetId}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls WHERE caller_id = ${targetId} OR callee_id = ${targetId}`),
    ]);
    res.json({
      messagesSent: Number((msgRow.rows[0] as any).cnt),
      giftsSent: Number((giftsSentRow.rows[0] as any).cnt),
      giftsReceived: Number((giftsRecvRow.rows[0] as any).cnt),
      callsTotal: Number((callsRow.rows[0] as any).cnt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// NEW: Send system announcement as bot to all users' bot chats
router.post("/admin/announcement", requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Укажите текст объявления" });

    // Find the bot by username (not hardcoded ID)
    const botRow = await db.execute(sql`SELECT id FROM users WHERE username = 'deepseek_ai' LIMIT 1`);
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
    const [byBalance, byMessages, byGifts] = await Promise.all([
      db.execute(sql`SELECT id, username, display_name, avatar_color, avatar_url, balance as score FROM users WHERE is_bot = false ORDER BY balance DESC LIMIT 5`),
      db.execute(sql`SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, COUNT(m.id)::int as score FROM users u LEFT JOIN messages m ON m.sender_id = u.id WHERE u.is_bot = false GROUP BY u.id ORDER BY score DESC LIMIT 5`),
      db.execute(sql`SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, COUNT(g.id)::int as score FROM users u LEFT JOIN gifts g ON g.sender_id = u.id WHERE u.is_bot = false GROUP BY u.id ORDER BY score DESC LIMIT 5`),
    ]);
    res.json({ byBalance: byBalance.rows, byMessages: byMessages.rows, byGifts: byGifts.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Ban / Unban
router.post("/admin/users/:userId/ban", requireAdmin, async (req, res) => {
  try {
    // Add is_banned column if not exists
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE`);
    const targetId = Number(req.params.userId);
    if (targetId === req.currentUserId) return res.status(400).json({ error: "Нельзя забанить себя" });
    const { ban } = req.body;
    await db.execute(sql`UPDATE users SET is_banned = ${!!ban} WHERE id = ${targetId}`);
    const target = await db.execute(sql`SELECT username, is_banned FROM users WHERE id = ${targetId}`);
    const row = target.rows[0] as any;
    res.json({ success: true, isBanned: row?.is_banned ?? !!ban, message: ban ? `@${row?.username} заблокирован` : `@${row?.username} разблокирован` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/topup-requests", requireAdmin, async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT tr.id, tr.user_id, tr.amount, tr.package_label, tr.price_label, tr.status, tr.created_at, tr.resolved_at,
                 u.username, u.display_name, u.avatar_color, u.avatar_url
          FROM topup_requests tr
          JOIN users u ON u.id = tr.user_id
          ORDER BY tr.created_at DESC
          LIMIT 100`
    );
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/topup-requests/:id/approve", requireAdmin, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    const rows = await db.execute(
      sql`SELECT * FROM topup_requests WHERE id = ${reqId} AND status = 'pending'`
    );
    const tr = rows.rows[0] as any;
    if (!tr) return res.status(404).json({ error: "Заявка не найдена или уже обработана" });

    await db.execute(sql`UPDATE users SET balance = balance + ${tr.amount} WHERE id = ${tr.user_id}`);
    await db.execute(sql`UPDATE topup_requests SET status = 'approved', resolved_at = NOW() WHERE id = ${reqId}`);

    const balRow = await db.execute(sql`SELECT balance FROM users WHERE id = ${tr.user_id}`);
    const newBalance = Number((balRow.rows[0] as any).balance);
    res.json({ success: true, userId: tr.user_id, amount: tr.amount, newBalance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/admin/topup-requests/:id/deny", requireAdmin, async (req, res) => {
  try {
    const reqId = Number(req.params.id);
    const rows = await db.execute(
      sql`SELECT id FROM topup_requests WHERE id = ${reqId} AND status = 'pending'`
    );
    if ((rows.rows as any[]).length === 0) return res.status(404).json({ error: "Заявка не найдена или уже обработана" });
    await db.execute(sql`UPDATE topup_requests SET status = 'denied', resolved_at = NOW() WHERE id = ${reqId}`);
    res.json({ success: true });
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

router.get("/admin/check", async (req, res) => {
  try {
    const ok = await isAdminUser(req.currentUserId);
    res.json({ isAdmin: ok });
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [totals, msgs, chts, calls, gifts] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as total_users, SUM(balance) as total_spark, SUM(CASE WHEN has_prime THEN 1 ELSE 0 END) as prime_users FROM users`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM chats`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts`),
    ]);
    const row = totals.rows[0] as any;
    res.json({
      totalUsers: Number(row.total_users),
      totalSpark: Number(row.total_spark || 0),
      primeUsers: Number(row.prime_users || 0),
      totalMessages: Number((msgs.rows[0] as any).cnt),
      totalChats: Number((chts.rows[0] as any).cnt),
      totalCalls: Number((calls.rows[0] as any).cnt),
      totalGifts: Number((gifts.rows[0] as any).cnt),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
