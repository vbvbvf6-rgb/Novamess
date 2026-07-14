import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ── Ensure tables exist on startup ───────────────────────────────────────────
db.execute(sql`
  CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`).catch(() => {});

db.execute(sql`
  CREATE TABLE IF NOT EXISTS clan_members (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clan_id, user_id)
  )
`).catch(() => {});

// GET /clans — list all clans with member count
router.get("/clans", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.name, c.tag, c.description, c.logo_url, c.created_at,
             u.display_name AS owner_name, u.avatar_url AS owner_avatar, u.avatar_color AS owner_color,
             COUNT(cm.id)::int AS member_count,
             MAX(CASE WHEN cm.user_id = ${req.currentUserId} THEN cm.role END) AS my_role
      FROM clans c
      JOIN users u ON u.id = c.owner_id
      LEFT JOIN clan_members cm ON cm.clan_id = c.id
      GROUP BY c.id, u.display_name, u.avatar_url, u.avatar_color
      ORDER BY member_count DESC, c.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /clans/:id — clan details with members
router.get("/clans/:id", async (req, res) => {
  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const clanRows = await db.execute(sql`
      SELECT c.id, c.name, c.tag, c.description, c.logo_url, c.owner_id, c.created_at,
             u.display_name AS owner_name, u.avatar_url AS owner_avatar, u.avatar_color AS owner_color,
             COUNT(cm.id)::int AS member_count
      FROM clans c
      JOIN users u ON u.id = c.owner_id
      LEFT JOIN clan_members cm ON cm.clan_id = c.id
      WHERE c.id = ${clanId}
      GROUP BY c.id, u.display_name, u.avatar_url, u.avatar_color
    `);
    const clan = clanRows.rows[0] as any;
    if (!clan) return res.status(404).json({ error: "Клан не найден" });

    const memberRows = await db.execute(sql`
      SELECT cm.user_id, cm.role, cm.joined_at,
             u.display_name, u.username, u.avatar_url, u.avatar_color, u.status
      FROM clan_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.clan_id = ${clanId}
      ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, cm.joined_at ASC
    `);

    res.json({ ...clan, members: memberRows.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /clans — create clan
router.post("/clans", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    // Check if user already owns or is in a clan
    const existing = await db.execute(sql`
      SELECT clan_id FROM clan_members WHERE user_id = ${uid} LIMIT 1
    `);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Вы уже состоите в клане" });
    }

    const { name, tag, description } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Название клана должно быть не менее 2 символов" });
    }
    if (!tag || typeof tag !== "string" || !/^[A-Z0-9]{2,5}$/.test(tag.trim().toUpperCase())) {
      return res.status(400).json({ error: "Тег должен содержать 2-5 заглавных латинских букв или цифр" });
    }

    const cleanName = name.trim().slice(0, 50);
    const cleanTag = tag.trim().toUpperCase().slice(0, 5);
    const cleanDesc = description ? String(description).trim().slice(0, 300) : null;

    const result = await db.execute(sql`
      INSERT INTO clans (name, tag, description, owner_id)
      VALUES (${cleanName}, ${cleanTag}, ${cleanDesc}, ${uid})
      RETURNING id
    `);
    const clanId = (result.rows[0] as any).id;

    // Add owner as member with 'owner' role
    await db.execute(sql`
      INSERT INTO clan_members (clan_id, user_id, role)
      VALUES (${clanId}, ${uid}, 'owner')
    `);

    res.status(201).json({ id: clanId, name: cleanName, tag: cleanTag, description: cleanDesc });
  } catch (err: any) {
    if (err?.message?.includes("unique") || err?.code === "23505") {
      return res.status(400).json({ error: "Клан с таким именем или тегом уже существует" });
    }
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PUT /clans/:id — update clan info (owner or officer)
router.put("/clans/:id", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const memberRow = await db.execute(sql`
      SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1
    `);
    const role = (memberRow.rows[0] as any)?.role;
    if (!role || !["owner", "officer"].includes(role)) {
      return res.status(403).json({ error: "Нет прав для редактирования клана" });
    }

    const { description, logoUrl } = req.body;
    const updates: string[] = [];
    if (description !== undefined) updates.push(`description = '${String(description).trim().slice(0, 300).replace(/'/g, "''")}'`);
    if (logoUrl !== undefined) updates.push(`logo_url = ${logoUrl ? `'${String(logoUrl).slice(0, 500).replace(/'/g, "''")}'` : "NULL"}`);

    if (updates.length > 0) {
      await db.execute(sql`UPDATE clans SET description = ${description !== undefined ? String(description).trim().slice(0, 300) : sql`description`}, logo_url = ${logoUrl !== undefined ? (logoUrl || null) : sql`logo_url`} WHERE id = ${clanId}`);
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /clans/:id — delete clan (owner only)
router.delete("/clans/:id", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const clan = await db.execute(sql`SELECT owner_id FROM clans WHERE id = ${clanId} LIMIT 1`);
    const owner = (clan.rows[0] as any);
    if (!owner) return res.status(404).json({ error: "Клан не найден" });
    if (owner.owner_id !== uid) return res.status(403).json({ error: "Только владелец может удалить клан" });

    await db.execute(sql`DELETE FROM clans WHERE id = ${clanId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /clans/:id/join — join clan
router.post("/clans/:id/join", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const clan = await db.execute(sql`SELECT id FROM clans WHERE id = ${clanId} LIMIT 1`);
    if (!clan.rows.length) return res.status(404).json({ error: "Клан не найден" });

    const existing = await db.execute(sql`
      SELECT clan_id FROM clan_members WHERE user_id = ${uid} LIMIT 1
    `);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Вы уже состоите в клане" });
    }

    await db.execute(sql`
      INSERT INTO clan_members (clan_id, user_id, role) VALUES (${clanId}, ${uid}, 'member')
      ON CONFLICT (clan_id, user_id) DO NOTHING
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /clans/:id/leave — leave clan
router.post("/clans/:id/leave", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const memberRow = await db.execute(sql`
      SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1
    `);
    const role = (memberRow.rows[0] as any)?.role;
    if (!role) return res.status(400).json({ error: "Вы не состоите в этом клане" });

    if (role === "owner") {
      // Transfer ownership to an officer, or the oldest member, or dissolve
      const nextOwner = await db.execute(sql`
        SELECT user_id FROM clan_members
        WHERE clan_id = ${clanId} AND user_id != ${uid}
        ORDER BY CASE role WHEN 'officer' THEN 0 ELSE 1 END, joined_at ASC
        LIMIT 1
      `);
      const next = (nextOwner.rows[0] as any)?.user_id;
      if (next) {
        await db.execute(sql`UPDATE clan_members SET role = 'owner' WHERE clan_id = ${clanId} AND user_id = ${next}`);
        await db.execute(sql`UPDATE clans SET owner_id = ${next} WHERE id = ${clanId}`);
        await db.execute(sql`DELETE FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid}`);
      } else {
        // Last member — delete the clan
        await db.execute(sql`DELETE FROM clans WHERE id = ${clanId}`);
      }
    } else {
      await db.execute(sql`DELETE FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid}`);
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /clans/:id/members/:userId — kick member (owner/officer)
router.delete("/clans/:id/members/:userId", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const targetId = Number(req.params.userId);
    if (!clanId || !targetId) return res.status(400).json({ error: "Неверный id" });

    const myRow = await db.execute(sql`
      SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1
    `);
    const myRole = (myRow.rows[0] as any)?.role;
    if (!myRole || !["owner", "officer"].includes(myRole)) {
      return res.status(403).json({ error: "Нет прав для исключения участников" });
    }

    const targetRow = await db.execute(sql`
      SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${targetId} LIMIT 1
    `);
    const targetRole = (targetRow.rows[0] as any)?.role;
    if (!targetRole) return res.status(404).json({ error: "Участник не найден" });
    if (targetRole === "owner") return res.status(403).json({ error: "Нельзя исключить владельца" });
    if (myRole === "officer" && targetRole === "officer") {
      return res.status(403).json({ error: "Офицер не может исключить другого офицера" });
    }

    await db.execute(sql`DELETE FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${targetId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PATCH /clans/:id/members/:userId/role — promote/demote (owner only)
router.patch("/clans/:id/members/:userId/role", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const targetId = Number(req.params.userId);
    const { role } = req.body;
    if (!["officer", "member"].includes(role)) {
      return res.status(400).json({ error: "Роль должна быть 'officer' или 'member'" });
    }

    const myRow = await db.execute(sql`
      SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1
    `);
    if ((myRow.rows[0] as any)?.role !== "owner") {
      return res.status(403).json({ error: "Только владелец может менять роли" });
    }

    await db.execute(sql`
      UPDATE clan_members SET role = ${role} WHERE clan_id = ${clanId} AND user_id = ${targetId}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
