import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ── Schema on startup ─────────────────────────────────────────────────────────
const init = async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clans (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL UNIQUE,
      description TEXT,
      logo_url TEXT,
      cover_url TEXT,
      is_private BOOLEAN NOT NULL DEFAULT FALSE,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {});

  // Add new columns to existing table if they don't exist
  await db.execute(sql`ALTER TABLE clans ADD COLUMN IF NOT EXISTS cover_url TEXT`).catch(() => {});
  await db.execute(sql`ALTER TABLE clans ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});
  await db.execute(sql`ALTER TABLE clans ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await db.execute(sql`ALTER TABLE clans ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0`).catch(() => {});

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clan_members (
      id SERIAL PRIMARY KEY,
      clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(clan_id, user_id)
    )
  `).catch(() => {});

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clan_join_requests (
      id SERIAL PRIMARY KEY,
      clan_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(clan_id, user_id)
    )
  `).catch(() => {});

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS clan_wars (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      challenger_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
      defender_id INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'upcoming',
      challenger_score INTEGER NOT NULL DEFAULT 0,
      defender_score INTEGER NOT NULL DEFAULT 0,
      winner_id INTEGER REFERENCES clans(id) ON DELETE SET NULL,
      prize_description TEXT,
      start_at TIMESTAMP WITH TIME ZONE NOT NULL,
      end_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {});
};
init();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function isAdmin(userId: number): Promise<boolean> {
  if (!userId) return false;
  const row = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`);
  return !!(row.rows[0] as any)?.is_admin;
}

// ── GET /clans ────────────────────────────────────────────────────────────────
router.get("/clans", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.name, c.tag, c.description, c.logo_url, c.cover_url,
             c.is_private, c.wins, c.losses, c.created_at,
             u.display_name AS owner_name, u.avatar_url AS owner_avatar, u.avatar_color AS owner_color,
             COUNT(cm.id)::int AS member_count,
             MAX(CASE WHEN cm.user_id = ${req.currentUserId} THEN cm.role END) AS my_role,
             (SELECT COUNT(*)::int FROM clan_join_requests jr
              WHERE jr.clan_id = c.id AND jr.user_id = ${req.currentUserId} AND jr.status = 'pending') AS my_pending_request
      FROM clans c
      JOIN users u ON u.id = c.owner_id
      LEFT JOIN clan_members cm ON cm.clan_id = c.id
      GROUP BY c.id, u.display_name, u.avatar_url, u.avatar_color
      ORDER BY c.wins DESC, member_count DESC, c.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── GET /clans/wars ───────────────────────────────────────────────────────────
router.get("/clans/wars", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT w.*,
             c1.name AS challenger_name, c1.tag AS challenger_tag, c1.logo_url AS challenger_logo,
             c2.name AS defender_name, c2.tag AS defender_tag, c2.logo_url AS defender_logo,
             wc.name AS winner_name
      FROM clan_wars w
      JOIN clans c1 ON c1.id = w.challenger_id
      JOIN clans c2 ON c2.id = w.defender_id
      LEFT JOIN clans wc ON wc.id = w.winner_id
      ORDER BY w.status = 'active' DESC, w.start_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── GET /clans/:id ────────────────────────────────────────────────────────────
router.get("/clans/:id", async (req, res) => {
  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const [clanRows, memberRows, warRows] = await Promise.all([
      db.execute(sql`
        SELECT c.id, c.name, c.tag, c.description, c.logo_url, c.cover_url,
               c.is_private, c.wins, c.losses, c.owner_id, c.created_at,
               u.display_name AS owner_name, u.avatar_url AS owner_avatar, u.avatar_color AS owner_color,
               COUNT(cm.id)::int AS member_count
        FROM clans c
        JOIN users u ON u.id = c.owner_id
        LEFT JOIN clan_members cm ON cm.clan_id = c.id
        WHERE c.id = ${clanId}
        GROUP BY c.id, u.display_name, u.avatar_url, u.avatar_color
      `),
      db.execute(sql`
        SELECT cm.user_id, cm.role, cm.joined_at,
               u.display_name, u.username, u.avatar_url, u.avatar_color, u.status
        FROM clan_members cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.clan_id = ${clanId}
        ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, cm.joined_at ASC
      `),
      db.execute(sql`
        SELECT w.*,
               c1.name AS challenger_name, c1.tag AS challenger_tag,
               c2.name AS defender_name, c2.tag AS defender_tag,
               wc.name AS winner_name
        FROM clan_wars w
        JOIN clans c1 ON c1.id = w.challenger_id
        JOIN clans c2 ON c2.id = w.defender_id
        LEFT JOIN clans wc ON wc.id = w.winner_id
        WHERE (w.challenger_id = ${clanId} OR w.defender_id = ${clanId})
          AND w.status IN ('active','upcoming')
        ORDER BY w.start_at ASC
        LIMIT 5
      `),
    ]);

    const clan = clanRows.rows[0] as any;
    if (!clan) return res.status(404).json({ error: "Клан не найден" });

    res.json({ ...clan, members: memberRows.rows, active_wars: warRows.rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── POST /clans ───────────────────────────────────────────────────────────────
router.post("/clans", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const existing = await db.execute(sql`SELECT clan_id FROM clan_members WHERE user_id = ${uid} LIMIT 1`);
    if (existing.rows.length > 0) return res.status(400).json({ error: "Вы уже состоите в клане" });

    const { name, tag, description, isPrivate } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2)
      return res.status(400).json({ error: "Название клана должно быть не менее 2 символов" });
    if (!tag || typeof tag !== "string" || !/^[A-Z0-9]{2,5}$/.test(tag.trim().toUpperCase()))
      return res.status(400).json({ error: "Тег: 2-5 заглавных латинских букв или цифр" });

    const cleanName = name.trim().slice(0, 50);
    const cleanTag = tag.trim().toUpperCase().slice(0, 5);
    const cleanDesc = description ? String(description).trim().slice(0, 300) : null;
    const priv = isPrivate === true;

    const result = await db.execute(sql`
      INSERT INTO clans (name, tag, description, is_private, owner_id)
      VALUES (${cleanName}, ${cleanTag}, ${cleanDesc}, ${priv}, ${uid})
      RETURNING id
    `);
    const clanId = (result.rows[0] as any).id;
    await db.execute(sql`INSERT INTO clan_members (clan_id, user_id, role) VALUES (${clanId}, ${uid}, 'owner')`);
    res.status(201).json({ id: clanId, name: cleanName, tag: cleanTag, description: cleanDesc });
  } catch (err: any) {
    if (err?.code === "23505") return res.status(400).json({ error: "Клан с таким именем или тегом уже существует" });
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── PUT /clans/:id ────────────────────────────────────────────────────────────
router.put("/clans/:id", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    if (!clanId) return res.status(400).json({ error: "Неверный id" });

    const memberRow = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    const role = (memberRow.rows[0] as any)?.role;
    if (!role || !["owner", "officer"].includes(role)) return res.status(403).json({ error: "Нет прав" });

    const { description, logoUrl, coverUrl, isPrivate } = req.body;
    await db.execute(sql`
      UPDATE clans SET
        description = ${description !== undefined ? String(description).trim().slice(0, 300) : sql`description`},
        logo_url    = ${logoUrl !== undefined ? (logoUrl || null) : sql`logo_url`},
        cover_url   = ${coverUrl !== undefined ? (coverUrl || null) : sql`cover_url`},
        is_private  = ${isPrivate !== undefined ? Boolean(isPrivate) : sql`is_private`}
      WHERE id = ${clanId}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── DELETE /clans/:id ─────────────────────────────────────────────────────────
router.delete("/clans/:id", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const clan = await db.execute(sql`SELECT owner_id FROM clans WHERE id = ${clanId} LIMIT 1`);
    const owner = (clan.rows[0] as any);
    if (!owner) return res.status(404).json({ error: "Клан не найден" });

    const admin = await isAdmin(uid);
    if (owner.owner_id !== uid && !admin) return res.status(403).json({ error: "Только владелец может удалить клан" });

    await db.execute(sql`DELETE FROM clans WHERE id = ${clanId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── POST /clans/:id/join ──────────────────────────────────────────────────────
router.post("/clans/:id/join", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const clanRow = await db.execute(sql`SELECT id, is_private FROM clans WHERE id = ${clanId} LIMIT 1`);
    const clan = clanRow.rows[0] as any;
    if (!clan) return res.status(404).json({ error: "Клан не найден" });

    const existing = await db.execute(sql`SELECT clan_id FROM clan_members WHERE user_id = ${uid} LIMIT 1`);
    if (existing.rows.length > 0) return res.status(400).json({ error: "Вы уже состоите в клане" });

    if (clan.is_private) return res.status(400).json({ error: "Клан закрытый. Подайте заявку на вступление." });

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

// ── POST /clans/:id/leave ─────────────────────────────────────────────────────
router.post("/clans/:id/leave", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const memberRow = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    const role = (memberRow.rows[0] as any)?.role;
    if (!role) return res.status(400).json({ error: "Вы не состоите в этом клане" });

    if (role === "owner") {
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

// ── POST /clans/:id/request ───────────────────────────────────────────────────
router.post("/clans/:id/request", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const clan = await db.execute(sql`SELECT id FROM clans WHERE id = ${clanId} LIMIT 1`);
    if (!clan.rows.length) return res.status(404).json({ error: "Клан не найден" });

    const inClan = await db.execute(sql`SELECT clan_id FROM clan_members WHERE user_id = ${uid} LIMIT 1`);
    if (inClan.rows.length) return res.status(400).json({ error: "Вы уже состоите в клане" });

    const existing = await db.execute(sql`
      SELECT id FROM clan_join_requests WHERE clan_id = ${clanId} AND user_id = ${uid} AND status = 'pending' LIMIT 1
    `);
    if (existing.rows.length) return res.status(400).json({ error: "Заявка уже подана" });

    const { message } = req.body;
    await db.execute(sql`
      INSERT INTO clan_join_requests (clan_id, user_id, message)
      VALUES (${clanId}, ${uid}, ${message ? String(message).trim().slice(0, 200) : null})
      ON CONFLICT (clan_id, user_id) DO UPDATE SET status = 'pending', message = EXCLUDED.message, created_at = NOW()
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── GET /clans/:id/requests ───────────────────────────────────────────────────
router.get("/clans/:id/requests", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const myRole = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    const role = (myRole.rows[0] as any)?.role;
    if (!role || !["owner", "officer"].includes(role)) return res.status(403).json({ error: "Нет прав" });

    const rows = await db.execute(sql`
      SELECT jr.id, jr.user_id, jr.message, jr.created_at,
             u.display_name, u.username, u.avatar_url, u.avatar_color
      FROM clan_join_requests jr
      JOIN users u ON u.id = jr.user_id
      WHERE jr.clan_id = ${clanId} AND jr.status = 'pending'
      ORDER BY jr.created_at ASC
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── POST /clans/:id/requests/:reqId/accept ────────────────────────────────────
router.post("/clans/:id/requests/:reqId/accept", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const reqId = Number(req.params.reqId);

    const myRole = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    if (!["owner", "officer"].includes((myRole.rows[0] as any)?.role)) return res.status(403).json({ error: "Нет прав" });

    const jrRow = await db.execute(sql`SELECT user_id FROM clan_join_requests WHERE id = ${reqId} AND clan_id = ${clanId} AND status = 'pending' LIMIT 1`);
    const jr = jrRow.rows[0] as any;
    if (!jr) return res.status(404).json({ error: "Заявка не найдена" });

    const inClan = await db.execute(sql`SELECT clan_id FROM clan_members WHERE user_id = ${jr.user_id} LIMIT 1`);
    if (inClan.rows.length) {
      await db.execute(sql`UPDATE clan_join_requests SET status = 'declined' WHERE id = ${reqId}`);
      return res.status(400).json({ error: "Пользователь уже состоит в клане" });
    }

    await db.execute(sql`INSERT INTO clan_members (clan_id, user_id, role) VALUES (${clanId}, ${jr.user_id}, 'member') ON CONFLICT DO NOTHING`);
    await db.execute(sql`UPDATE clan_join_requests SET status = 'accepted' WHERE id = ${reqId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── POST /clans/:id/requests/:reqId/decline ───────────────────────────────────
router.post("/clans/:id/requests/:reqId/decline", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const reqId = Number(req.params.reqId);

    const myRole = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    if (!["owner", "officer"].includes((myRole.rows[0] as any)?.role)) return res.status(403).json({ error: "Нет прав" });

    await db.execute(sql`UPDATE clan_join_requests SET status = 'declined' WHERE id = ${reqId} AND clan_id = ${clanId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── DELETE /clans/:id/members/:userId ────────────────────────────────────────
router.delete("/clans/:id/members/:userId", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const targetId = Number(req.params.userId);

    const myRow = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    const myRole = (myRow.rows[0] as any)?.role;
    if (!myRole || !["owner", "officer"].includes(myRole)) return res.status(403).json({ error: "Нет прав" });

    const targetRow = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${targetId} LIMIT 1`);
    const targetRole = (targetRow.rows[0] as any)?.role;
    if (!targetRole) return res.status(404).json({ error: "Участник не найден" });
    if (targetRole === "owner") return res.status(403).json({ error: "Нельзя исключить владельца" });
    if (myRole === "officer" && targetRole === "officer") return res.status(403).json({ error: "Офицер не может исключить другого офицера" });

    await db.execute(sql`DELETE FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${targetId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── PATCH /clans/:id/members/:userId/role ────────────────────────────────────
router.patch("/clans/:id/members/:userId/role", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Требуется авторизация" });

  try {
    const clanId = Number(req.params.id);
    const targetId = Number(req.params.userId);
    const { role } = req.body;
    if (!["officer", "member"].includes(role)) return res.status(400).json({ error: "Роль должна быть 'officer' или 'member'" });

    const myRow = await db.execute(sql`SELECT role FROM clan_members WHERE clan_id = ${clanId} AND user_id = ${uid} LIMIT 1`);
    if ((myRow.rows[0] as any)?.role !== "owner") return res.status(403).json({ error: "Только владелец может менять роли" });

    await db.execute(sql`UPDATE clan_members SET role = ${role} WHERE clan_id = ${clanId} AND user_id = ${targetId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — Clan Wars Management
// ═══════════════════════════════════════════════════════════════════════════════

// GET /admin/clans — list clans for admin selector
router.get("/admin/clans", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid || !(await isAdmin(uid))) return res.status(403).json({ error: "Нет прав" });
  try {
    const rows = await db.execute(sql`
      SELECT c.id, c.name, c.tag, c.wins, c.losses,
             COUNT(cm.id)::int AS member_count
      FROM clans c
      LEFT JOIN clan_members cm ON cm.clan_id = c.id
      GROUP BY c.id ORDER BY c.name ASC
    `);
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /admin/clans/wars — create war
router.post("/admin/clans/wars", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid || !(await isAdmin(uid))) return res.status(403).json({ error: "Нет прав" });

  try {
    const { title, challengerId, defenderId, startAt, endAt, prizeDescription } = req.body;
    if (!title || !challengerId || !defenderId || !startAt || !endAt)
      return res.status(400).json({ error: "Заполните все обязательные поля" });
    if (challengerId === defenderId)
      return res.status(400).json({ error: "Нельзя выбрать один и тот же клан" });

    const result = await db.execute(sql`
      INSERT INTO clan_wars (title, challenger_id, defender_id, start_at, end_at, prize_description, status, created_by)
      VALUES (
        ${String(title).trim().slice(0, 100)},
        ${Number(challengerId)}, ${Number(defenderId)},
        ${startAt}, ${endAt},
        ${prizeDescription ? String(prizeDescription).trim().slice(0, 200) : null},
        'upcoming', ${uid}
      )
      RETURNING id
    `);
    res.status(201).json({ id: (result.rows[0] as any).id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// PUT /admin/clans/wars/:id — update scores / status / winner
router.put("/admin/clans/wars/:id", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid || !(await isAdmin(uid))) return res.status(403).json({ error: "Нет прав" });

  try {
    const warId = Number(req.params.id);
    const { challengerScore, defenderScore, status, winnerId } = req.body;

    const war = await db.execute(sql`SELECT * FROM clan_wars WHERE id = ${warId} LIMIT 1`);
    if (!war.rows.length) return res.status(404).json({ error: "Битва не найдена" });
    const w = war.rows[0] as any;

    const newChallengerScore = challengerScore !== undefined ? Number(challengerScore) : w.challenger_score;
    const newDefenderScore = defenderScore !== undefined ? Number(defenderScore) : w.defender_score;
    const newStatus = status || w.status;
    const newWinnerId = winnerId !== undefined ? (winnerId || null) : w.winner_id;

    await db.execute(sql`
      UPDATE clan_wars SET
        challenger_score = ${newChallengerScore},
        defender_score   = ${newDefenderScore},
        status           = ${newStatus},
        winner_id        = ${newWinnerId}
      WHERE id = ${warId}
    `);

    // If war just finished, update clan wins/losses
    if (newStatus === "finished" && w.status !== "finished" && newWinnerId) {
      const loserId = newWinnerId === w.challenger_id ? w.defender_id : w.challenger_id;
      await db.execute(sql`UPDATE clans SET wins = wins + 1 WHERE id = ${newWinnerId}`);
      await db.execute(sql`UPDATE clans SET losses = losses + 1 WHERE id = ${loserId}`);
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// DELETE /admin/clans/wars/:id — delete war
router.delete("/admin/clans/wars/:id", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid || !(await isAdmin(uid))) return res.status(403).json({ error: "Нет прав" });

  try {
    const warId = Number(req.params.id);
    await db.execute(sql`DELETE FROM clan_wars WHERE id = ${warId}`);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
