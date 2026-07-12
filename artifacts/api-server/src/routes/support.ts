import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { offloadDataUrl } from "../lib/objectStorage";

const router = Router();

// ── Bug Reports ───────────────────────────────────────────────────────────────

router.post("/support/bugs", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { title, description, category, platformInfo, screenshotUrl } = req.body;
    if (!title || !description) return res.status(400).json({ error: "title и description обязательны" });
    if (title.length > 200) return res.status(400).json({ error: "Заголовок слишком длинный" });
    if (description.length > 5000) return res.status(400).json({ error: "Описание слишком длинное" });

    const offloadedScreenshotUrl = await offloadDataUrl(screenshotUrl, "support");

    const rows = await db.execute(sql`
      ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screenshot_url TEXT
    `).catch(() => {});
    const rows2 = await db.execute(sql`
      INSERT INTO bug_reports (user_id, title, description, category, platform_info, screenshot_url)
      VALUES (${uid}, ${title.trim()}, ${description.trim()}, ${category || 'other'}, ${platformInfo || null}, ${offloadedScreenshotUrl || null})
      RETURNING id, title, category, status, created_at
    `);
    res.status(201).json({ success: true, report: rows2.rows[0] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/support/bugs", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT id, title, description, category, status, admin_note, created_at, resolved_at
      FROM bug_reports WHERE user_id = ${uid}
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/support/bugs/:id", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const bugId = Number(req.params.id);
    if (!bugId) return res.status(400).json({ error: "Неверный id" });
    await db.execute(sql`DELETE FROM bug_reports WHERE id = ${bugId} AND user_id = ${uid}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── Support Tickets ───────────────────────────────────────────────────────────

router.post("/support/tickets", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { subject, firstMessage, imageUrl } = req.body;
    if (!subject || !firstMessage) return res.status(400).json({ error: "subject и firstMessage обязательны" });
    if (subject.length > 200) return res.status(400).json({ error: "Тема слишком длинная" });

    const ticketRow = await db.execute(sql`
      INSERT INTO support_tickets (user_id, subject)
      VALUES (${uid}, ${subject.trim()})
      RETURNING id, subject, status, created_at
    `);
    const ticket = ticketRow.rows[0] as any;

    await db.execute(sql`
      ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS image_url TEXT
    `).catch(() => {});
    await db.execute(sql`
      INSERT INTO support_messages (ticket_id, user_id, is_admin, text)
      VALUES (${ticket.id}, ${uid}, false, ${firstMessage.trim()})
    `);

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/support/tickets", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT t.id, t.subject, t.status, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
        (SELECT text FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT is_admin FROM support_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_is_admin
      FROM support_tickets t
      WHERE t.user_id = ${uid}
      ORDER BY t.updated_at DESC
      LIMIT 30
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/support/tickets/:ticketId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const ticketId = Number(req.params.ticketId);

    const ticketRow = await db.execute(sql`SELECT * FROM support_tickets WHERE id = ${ticketId} AND user_id = ${uid}`);
    const ticket = ticketRow.rows[0] as any;
    if (!ticket) return res.status(404).json({ error: "Тикет не найден" });

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

router.post("/support/tickets/:ticketId/messages", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const ticketId = Number(req.params.ticketId);
    const { text, imageUrl } = req.body;
    if (!text && !imageUrl) return res.status(400).json({ error: "text или imageUrl обязателен" });

    const ticketRow = await db.execute(sql`SELECT id, status FROM support_tickets WHERE id = ${ticketId} AND user_id = ${uid}`);
    const ticket = ticketRow.rows[0] as any;
    if (!ticket) return res.status(404).json({ error: "Тикет не найден" });

    // If ticket is closed/resolved, only allow appeal messages
    const isAppeal = text && text.startsWith("🚩 АПЕЛЛЯЦИЯ:");
    if ((ticket.status === 'closed' || ticket.status === 'resolved') && !isAppeal) {
      return res.status(400).json({ error: "Тикет закрыт" });
    }

    const safeText = text ? String(text).slice(0, 5000) : null;
    const safeImageUrl = imageUrl ? String(imageUrl).slice(0, 500000) : null;

    // Add image_url column if not exists (safe migration)
    try {
      await db.execute(sql`ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS image_url TEXT`);
    } catch {}

    const msgRow = await db.execute(sql`
      INSERT INTO support_messages (ticket_id, user_id, is_admin, text, image_url)
      VALUES (${ticketId}, ${uid}, false, ${safeText}, ${safeImageUrl})
      RETURNING id, is_admin, text, image_url, created_at, user_id
    `);

    await db.execute(sql`UPDATE support_tickets SET updated_at = NOW(), status = 'open' WHERE id = ${ticketId}`);

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    res.status(201).json({
      ...msgRow.rows[0],
      display_name: user?.displayName,
      avatar_color: user?.avatarColor,
      avatar_url: (user as any)?.avatarUrl,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
