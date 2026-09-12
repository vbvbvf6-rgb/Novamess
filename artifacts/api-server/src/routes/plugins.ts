import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();
let schemaPromise: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS plugin_submissions (
        id SERIAL PRIMARY KEY,
        submitted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '1.0.0',
        entry_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        review_note TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function currentUserId(req: any, res: any): number | null {
  const userId = Number(req.currentUserId);
  if (!userId) {
    res.status(401).json({ error: "Требуется авторизация" });
    return null;
  }
  return userId;
}

async function isAdmin(userId: number) {
  const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId}`);
  const value = (rows.rows[0] as any)?.is_admin;
  return value === true || value === "t" || value === 1;
}

async function requireAdmin(req: any, res: any): Promise<number | null> {
  const userId = currentUserId(req, res);
  if (!userId) return null;
  if (!(await isAdmin(userId))) {
    res.status(403).json({ error: "Доступ запрещён" });
    return null;
  }
  return userId;
}

function validateEntryUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

router.get("/plugins", async (req, res) => {
  const userId = currentUserId(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const rows = await db.execute(sql`
      SELECT ps.id, ps.name, ps.description, ps.version, ps.entry_url, ps.submitted_by,
             u.username AS author_username, u.display_name AS author_display_name
      FROM plugin_submissions ps
      JOIN users u ON u.id = ps.submitted_by
      WHERE ps.status = 'approved'
      ORDER BY ps.updated_at DESC, ps.id DESC
    `);
    res.json(rows.rows);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить каталог плагинов" });
  }
});

router.get("/plugins/submissions/mine", async (req, res) => {
  const userId = currentUserId(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const rows = await db.execute(sql`
      SELECT id, name, description, version, entry_url, status, review_note, created_at, reviewed_at
      FROM plugin_submissions
      WHERE submitted_by = ${userId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить ваши заявки" });
  }
});

router.post("/plugins/submissions", async (req, res) => {
  const userId = currentUserId(req, res);
  if (!userId) return;
  const name = String(req.body?.name || "").trim().slice(0, 80);
  const description = String(req.body?.description || "").trim().slice(0, 500);
  const version = String(req.body?.version || "1.0.0").trim().slice(0, 30);
  const entryUrl = validateEntryUrl(req.body?.entryUrl);
  if (!name || !description || !entryUrl) {
    return res.status(400).json({ error: "Укажите название, описание и HTTPS-ссылку на страницу плагина" });
  }
  try {
    await ensureSchema();
    const duplicate = await db.execute(sql`
      SELECT id FROM plugin_submissions
      WHERE submitted_by = ${userId} AND entry_url = ${entryUrl} AND status IN ('pending', 'approved')
      LIMIT 1
    `);
    if (duplicate.rows.length) {
      return res.status(409).json({ error: "Такая заявка уже отправлена или одобрена" });
    }
    const created = await db.execute(sql`
      INSERT INTO plugin_submissions (submitted_by, name, description, version, entry_url)
      VALUES (${userId}, ${name}, ${description}, ${version || "1.0.0"}, ${entryUrl})
      RETURNING id, name, description, version, entry_url, status, created_at
    `);
    res.status(201).json(created.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось отправить заявку" });
  }
});

router.get("/admin/plugin-submissions", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  try {
    await ensureSchema();
    const rows = await db.execute(sql`
      SELECT ps.*, u.username, u.display_name, u.avatar_url, u.avatar_color
      FROM plugin_submissions ps
      JOIN users u ON u.id = ps.submitted_by
      ORDER BY CASE WHEN ps.status = 'pending' THEN 0 ELSE 1 END, ps.created_at DESC
    `);
    res.json(rows.rows);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить заявки на плагины" });
  }
});

router.post("/admin/plugin-submissions/:id/review", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const submissionId = Number(req.params.id);
  const status = req.body?.status;
  if (!Number.isInteger(submissionId) || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Укажите корректный статус заявки" });
  }
  try {
    await ensureSchema();
    const note = String(req.body?.reviewNote || "").trim().slice(0, 500) || null;
    const updated = await db.execute(sql`
      UPDATE plugin_submissions
      SET status = ${status}, review_note = ${note}, reviewed_by = ${adminId},
          reviewed_at = NOW(), updated_at = NOW()
      WHERE id = ${submissionId}
      RETURNING *
    `);
    if (!updated.rows.length) return res.status(404).json({ error: "Заявка не найдена" });
    res.json(updated.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось обновить заявку" });
  }
});

export default router;