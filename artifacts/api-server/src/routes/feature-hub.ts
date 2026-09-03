import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const PRIVACY_DEFAULTS = {
  whoCanMessage: "everyone",
  whoCanInvite: "contacts",
  phoneVisibility: "contacts",
  onlineVisibility: "everyone",
  avatarVisibility: "everyone",
  callsFrom: "contacts",
} as const;

const VALID_PRIVACY_VALUES = new Set(["everyone", "contacts", "nobody"]);
const VALID_ROLES = new Set(["owner", "moderator", "editor", "assistant", "analyst", "member"]);
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["manage_roles", "manage_antispam", "delete_messages", "edit_messages", "view_analytics", "view_audit"],
  moderator: ["delete_messages", "manage_antispam"],
  editor: ["edit_messages", "pin_messages"],
  assistant: ["invite_members", "approve_members"],
  analyst: ["view_analytics"],
  member: [],
};

let schemaPromise: Promise<void> | null = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS privacy_settings (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          who_can_message TEXT NOT NULL DEFAULT 'everyone',
          who_can_invite TEXT NOT NULL DEFAULT 'contacts',
          phone_visibility TEXT NOT NULL DEFAULT 'contacts',
          online_visibility TEXT NOT NULL DEFAULT 'everyone',
          avatar_visibility TEXT NOT NULL DEFAULT 'everyone',
          calls_from TEXT NOT NULL DEFAULT 'contacts',
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS privacy_overrides (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          who_can_message TEXT,
          who_can_invite TEXT,
          phone_visibility TEXT,
          online_visibility TEXT,
          avatar_visibility TEXT,
          calls_from TEXT,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, contact_id)
        );
        CREATE TABLE IF NOT EXISTS chat_antispam (
          chat_id INTEGER PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
          captcha_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          slow_mode_seconds INTEGER NOT NULL DEFAULT 0,
          links_new_member_seconds INTEGER NOT NULL DEFAULT 0,
          filter_words_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          suspicious_accounts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          banned_words TEXT[] NOT NULL DEFAULT '{}',
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS chat_roles (
          chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member',
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
          assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          PRIMARY KEY (chat_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS chat_action_log (
          id SERIAL PRIMARY KEY,
          chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          target_id INTEGER,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS playlists (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          is_public BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS playlist_tracks (
          id SERIAL PRIMARY KEY,
          playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          artist TEXT,
          media_url TEXT NOT NULL,
          duration_seconds INTEGER,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function auth(req: any, res: any): number | null {
  const userId = Number(req.currentUserId);
  if (!userId) {
    res.status(401).json({ error: "Требуется авторизация" });
    return null;
  }
  return userId;
}

async function writeAction(chatId: number, actorId: number, action: string, targetId: number | null = null, details: unknown = {}) {
  await db.execute(sql`
    INSERT INTO chat_action_log (chat_id, actor_id, action, target_id, details)
    VALUES (${chatId}, ${actorId}, ${action}, ${targetId}, ${JSON.stringify(details)}::jsonb)
  `);
}

async function canManageChat(chatId: number, userId: number): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT cm.role, cr.role AS extended_role
    FROM chat_members cm
    LEFT JOIN chat_roles cr ON cr.chat_id = cm.chat_id AND cr.user_id = cm.user_id
    WHERE cm.chat_id = ${chatId} AND cm.user_id = ${userId}
    LIMIT 1
  `);
  const row = result.rows[0] as any;
  return row && (row.role === "owner" || row.role === "admin" || row.extended_role === "owner" || row.extended_role === "moderator");
}

router.get("/privacy/settings", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const result = await db.execute(sql`
      INSERT INTO privacy_settings (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `);
    if (result.rows.length) return res.json(result.rows[0]);
    const existing = await db.execute(sql`SELECT * FROM privacy_settings WHERE user_id = ${userId}`);
    res.json(existing.rows[0] ?? { user_id: userId, ...PRIVACY_DEFAULTS });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить настройки приватности" });
  }
});

router.put("/privacy/settings", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const values = Object.fromEntries(
      Object.entries(req.body ?? {}).filter(([key, value]) =>
        ["whoCanMessage", "whoCanInvite", "phoneVisibility", "onlineVisibility", "avatarVisibility", "callsFrom"].includes(key)
        && typeof value === "string" && VALID_PRIVACY_VALUES.has(value)
      ),
    ) as Record<string, string>;
    if (!Object.keys(values).length) return res.status(400).json({ error: "Нет корректных настроек" });
    await db.execute(sql`
      INSERT INTO privacy_settings (
        user_id, who_can_message, who_can_invite, phone_visibility,
        online_visibility, avatar_visibility, calls_from, updated_at
      ) VALUES (
        ${userId},
        ${values.whoCanMessage ?? PRIVACY_DEFAULTS.whoCanMessage},
        ${values.whoCanInvite ?? PRIVACY_DEFAULTS.whoCanInvite},
        ${values.phoneVisibility ?? PRIVACY_DEFAULTS.phoneVisibility},
        ${values.onlineVisibility ?? PRIVACY_DEFAULTS.onlineVisibility},
        ${values.avatarVisibility ?? PRIVACY_DEFAULTS.avatarVisibility},
        ${values.callsFrom ?? PRIVACY_DEFAULTS.callsFrom},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        who_can_message = COALESCE(${values.whoCanMessage ?? null}, privacy_settings.who_can_message),
        who_can_invite = COALESCE(${values.whoCanInvite ?? null}, privacy_settings.who_can_invite),
        phone_visibility = COALESCE(${values.phoneVisibility ?? null}, privacy_settings.phone_visibility),
        online_visibility = COALESCE(${values.onlineVisibility ?? null}, privacy_settings.online_visibility),
        avatar_visibility = COALESCE(${values.avatarVisibility ?? null}, privacy_settings.avatar_visibility),
        calls_from = COALESCE(${values.callsFrom ?? null}, privacy_settings.calls_from),
        updated_at = NOW()
    `);
    const saved = await db.execute(sql`SELECT * FROM privacy_settings WHERE user_id = ${userId}`);
    res.json(saved.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось сохранить настройки приватности" });
  }
});

router.get("/privacy/overrides", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const rows = await db.execute(sql`
      SELECT po.*, u.username, u.display_name, u.avatar_url, u.avatar_color
      FROM privacy_overrides po
      JOIN users u ON u.id = po.contact_id
      WHERE po.user_id = ${userId}
      ORDER BY u.display_name
    `);
    res.json(rows.rows);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить исключения приватности" });
  }
});

router.put("/privacy/overrides/:contactId", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const contactId = Number(req.params.contactId);
  if (!contactId || contactId === userId) return res.status(400).json({ error: "Некорректный контакт" });
  try {
    await ensureSchema();
    const clean = (key: string) => typeof req.body?.[key] === "string" && VALID_PRIVACY_VALUES.has(req.body[key]) ? req.body[key] : null;
    await db.execute(sql`
      INSERT INTO privacy_overrides (
        user_id, contact_id, who_can_message, who_can_invite, phone_visibility,
        online_visibility, avatar_visibility, calls_from, updated_at
      ) VALUES (${userId}, ${contactId}, ${clean("whoCanMessage")}, ${clean("whoCanInvite")},
        ${clean("phoneVisibility")}, ${clean("onlineVisibility")}, ${clean("avatarVisibility")}, ${clean("callsFrom")}, NOW())
      ON CONFLICT (user_id, contact_id) DO UPDATE SET
        who_can_message = EXCLUDED.who_can_message, who_can_invite = EXCLUDED.who_can_invite,
        phone_visibility = EXCLUDED.phone_visibility, online_visibility = EXCLUDED.online_visibility,
        avatar_visibility = EXCLUDED.avatar_visibility, calls_from = EXCLUDED.calls_from, updated_at = NOW()
    `);
    const saved = await db.execute(sql`SELECT * FROM privacy_overrides WHERE user_id = ${userId} AND contact_id = ${contactId}`);
    res.json(saved.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось сохранить исключение" });
  }
});

router.delete("/privacy/overrides/:contactId", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    await db.execute(sql`DELETE FROM privacy_overrides WHERE user_id = ${userId} AND contact_id = ${Number(req.params.contactId)}`);
    res.status(204).send();
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось удалить исключение" });
  }
});

router.get("/chats/:chatId/antispam", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const chatId = Number(req.params.chatId);
  try {
    await ensureSchema();
    if (!(await canManageChat(chatId, userId))) return res.status(403).json({ error: "Нет прав модератора" });
    const result = await db.execute(sql`
      INSERT INTO chat_antispam (chat_id) VALUES (${chatId}) ON CONFLICT (chat_id) DO NOTHING RETURNING *
    `);
    if (result.rows.length) return res.json(result.rows[0]);
    const existing = await db.execute(sql`SELECT * FROM chat_antispam WHERE chat_id = ${chatId}`);
    res.json(existing.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить антиспам" });
  }
});

router.put("/chats/:chatId/antispam", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const chatId = Number(req.params.chatId);
  try {
    await ensureSchema();
    if (!(await canManageChat(chatId, userId))) return res.status(403).json({ error: "Нет прав модератора" });
    const body = req.body ?? {};
    const slow = Math.min(86400, Math.max(0, Number(body.slowModeSeconds) || 0));
    const links = Math.min(2592000, Math.max(0, Number(body.linksNewMemberSeconds) || 0));
    const words = Array.isArray(body.bannedWords) ? body.bannedWords.filter((word: unknown) => typeof word === "string").map((word: string) => word.trim().slice(0, 80)).filter(Boolean).slice(0, 100) : [];
    await db.execute(sql`
      INSERT INTO chat_antispam (chat_id, captcha_enabled, slow_mode_seconds, links_new_member_seconds,
        filter_words_enabled, suspicious_accounts_enabled, banned_words, updated_at)
      VALUES (${chatId}, ${Boolean(body.captchaEnabled)}, ${slow}, ${links}, ${Boolean(body.filterWordsEnabled)},
        ${body.suspiciousAccountsEnabled !== false}, ${words}, NOW())
      ON CONFLICT (chat_id) DO UPDATE SET
        captcha_enabled = EXCLUDED.captcha_enabled, slow_mode_seconds = EXCLUDED.slow_mode_seconds,
        links_new_member_seconds = EXCLUDED.links_new_member_seconds, filter_words_enabled = EXCLUDED.filter_words_enabled,
        suspicious_accounts_enabled = EXCLUDED.suspicious_accounts_enabled, banned_words = EXCLUDED.banned_words, updated_at = NOW()
    `);
    await writeAction(chatId, userId, "antispam_updated", null, { captchaEnabled: Boolean(body.captchaEnabled), slowModeSeconds: slow });
    const saved = await db.execute(sql`SELECT * FROM chat_antispam WHERE chat_id = ${chatId}`);
    res.json(saved.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось сохранить антиспам" });
  }
});

router.get("/chats/:chatId/roles", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const chatId = Number(req.params.chatId);
  try {
    await ensureSchema();
    const member = await db.execute(sql`
      SELECT cm.user_id, cm.role AS legacy_role, COALESCE(cr.role, cm.role) AS role,
             COALESCE(cr.permissions, '[]'::jsonb) AS permissions,
             u.display_name, u.username, u.avatar_url, u.avatar_color
      FROM chat_members cm
      JOIN users u ON u.id = cm.user_id
      LEFT JOIN chat_roles cr ON cr.chat_id = cm.chat_id AND cr.user_id = cm.user_id
      WHERE cm.chat_id = ${chatId}
      ORDER BY CASE COALESCE(cr.role, cm.role) WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, u.display_name
    `);
    const viewer = (member.rows as any[]).find(row => Number(row.user_id) === userId);
    if (!viewer) return res.status(403).json({ error: "Нет доступа к чату" });
    res.json({ roles: member.rows, permissions: ROLE_PERMISSIONS, canManage: ["owner", "admin", "moderator"].includes(viewer.role) });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить роли" });
  }
});

router.patch("/chats/:chatId/roles/:memberId", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const chatId = Number(req.params.chatId);
  const memberId = Number(req.params.memberId);
  const role = String(req.body?.role || "member");
  if (!VALID_ROLES.has(role) || !memberId) return res.status(400).json({ error: "Некорректная роль" });
  try {
    await ensureSchema();
    if (!(await canManageChat(chatId, userId))) return res.status(403).json({ error: "Нет прав владельца" });
    if (role === "owner") return res.status(403).json({ error: "Владельца нельзя назначить через эту форму" });
    const permissions = Array.isArray(req.body?.permissions)
      ? req.body.permissions.filter((item: unknown) => typeof item === "string" && ROLE_PERMISSIONS[role]?.includes(item))
      : (ROLE_PERMISSIONS[role] ?? []);
    await db.execute(sql`
      INSERT INTO chat_roles (chat_id, user_id, role, permissions, assigned_by, updated_at)
      VALUES (${chatId}, ${memberId}, ${role}, ${JSON.stringify(permissions)}::jsonb, ${userId}, NOW())
      ON CONFLICT (chat_id, user_id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions,
        assigned_by = EXCLUDED.assigned_by, updated_at = NOW()
    `);
    await writeAction(chatId, userId, "role_updated", memberId, { role, permissions });
    res.json({ ok: true, role, permissions });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось изменить роль" });
  }
});

router.get("/chats/:chatId/action-log", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const chatId = Number(req.params.chatId);
  try {
    await ensureSchema();
    const member = await db.execute(sql`SELECT role FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${userId}`);
    if (!member.rows.length) return res.status(403).json({ error: "Нет доступа к чату" });
    const rows = await db.execute(sql`
      SELECT l.*, u.display_name AS actor_name, u.username AS actor_username
      FROM chat_action_log l LEFT JOIN users u ON u.id = l.actor_id
      WHERE l.chat_id = ${chatId}
      ORDER BY l.created_at DESC LIMIT 100
    `);
    res.json(rows.rows);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить журнал действий" });
  }
});

router.get("/playlists", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const rows = await db.execute(sql`
      SELECT p.*, COUNT(pt.id)::int AS track_count
      FROM playlists p LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
      WHERE p.user_id = ${userId} OR p.is_public = TRUE
      GROUP BY p.id ORDER BY p.updated_at DESC
    `);
    res.json(rows.rows);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить плейлисты" });
  }
});

router.post("/playlists", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const name = String(req.body?.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: "Укажите название плейлиста" });
  try {
    await ensureSchema();
    const created = await db.execute(sql`
      INSERT INTO playlists (user_id, name, description, is_public)
      VALUES (${userId}, ${name}, ${String(req.body?.description || "").trim().slice(0, 240) || null}, ${Boolean(req.body?.isPublic)})
      RETURNING *
    `);
    res.status(201).json(created.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось создать плейлист" });
  }
});

router.get("/playlists/:playlistId", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    const playlist = await db.execute(sql`SELECT * FROM playlists WHERE id = ${Number(req.params.playlistId)} AND (user_id = ${userId} OR is_public = TRUE)`);
    if (!playlist.rows.length) return res.status(404).json({ error: "Плейлист не найден" });
    const tracks = await db.execute(sql`SELECT * FROM playlist_tracks WHERE playlist_id = ${Number(req.params.playlistId)} ORDER BY sort_order, id`);
    res.json({ ...playlist.rows[0], tracks: tracks.rows });
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось загрузить плейлист" });
  }
});

router.post("/playlists/:playlistId/tracks", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  const playlistId = Number(req.params.playlistId);
  const title = String(req.body?.title || "").trim().slice(0, 160);
  const mediaUrl = String(req.body?.mediaUrl || "").trim();
  if (!title || !mediaUrl) return res.status(400).json({ error: "Нужны название и аудиофайл" });
  try {
    await ensureSchema();
    const owner = await db.execute(sql`SELECT id FROM playlists WHERE id = ${playlistId} AND user_id = ${userId}`);
    if (!owner.rows.length) return res.status(403).json({ error: "Нет прав на этот плейлист" });
    const track = await db.execute(sql`
      INSERT INTO playlist_tracks (playlist_id, title, artist, media_url, duration_seconds, sort_order)
      VALUES (${playlistId}, ${title}, ${String(req.body?.artist || "").trim().slice(0, 120) || null},
        ${mediaUrl}, ${Number(req.body?.durationSeconds) || null},
        COALESCE((SELECT MAX(sort_order) + 1 FROM playlist_tracks WHERE playlist_id = ${playlistId}), 0))
      RETURNING *
    `);
    await db.execute(sql`UPDATE playlists SET updated_at = NOW() WHERE id = ${playlistId}`);
    res.status(201).json(track.rows[0]);
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось добавить трек" });
  }
});

router.delete("/playlists/:playlistId/tracks/:trackId", async (req, res) => {
  const userId = auth(req, res);
  if (!userId) return;
  try {
    await ensureSchema();
    await db.execute(sql`
      DELETE FROM playlist_tracks pt USING playlists p
      WHERE pt.id = ${Number(req.params.trackId)} AND pt.playlist_id = p.id
        AND p.id = ${Number(req.params.playlistId)} AND p.user_id = ${userId}
    `);
    res.status(204).send();
  } catch (error) {
    req.log.error(error);
    res.status(500).json({ error: "Не удалось удалить трек" });
  }
});

export default router;