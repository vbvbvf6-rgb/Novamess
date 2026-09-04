import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

function auth(req: any) {
  return Number(req.currentUserId || 0);
}

async function isMember(chatId: number, userId: number) {
  const result = await db.execute(sql`
    SELECT 1 FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${userId} LIMIT 1
  `);
  return result.rows.length > 0;
}

// Shared chat space: lightweight notes and tasks attached to an existing group.
router.get("/chats/:chatId/space", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  const [notes, tasks] = await Promise.all([
    db.execute(sql`
      SELECT id, title, body, created_by, updated_at
      FROM chat_space_notes WHERE chat_id = ${chatId}
      ORDER BY updated_at DESC LIMIT 50
    `),
    db.execute(sql`
      SELECT id, title, done, assignee_id, created_by, due_at, created_at
      FROM chat_space_tasks WHERE chat_id = ${chatId}
      ORDER BY done ASC, created_at DESC LIMIT 100
    `),
  ]);
  return res.json({ notes: notes.rows, tasks: tasks.rows });
});

router.post("/chats/:chatId/space/notes", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  const title = String(req.body?.title || "Без названия").trim().slice(0, 120);
  const body = String(req.body?.body || "").trim().slice(0, 20_000);
  if (!body) return res.status(400).json({ error: "Заметка не может быть пустой" });
  const inserted = await db.execute(sql`
    INSERT INTO chat_space_notes (chat_id, title, body, created_by)
    VALUES (${chatId}, ${title}, ${body}, ${userId})
    RETURNING id, title, body, created_by, updated_at
  `);
  return res.status(201).json(inserted.rows[0]);
});

router.put("/chats/:chatId/space/notes/:noteId", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  const noteId = Number(req.params.noteId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  const title = String(req.body?.title || "Без названия").trim().slice(0, 120);
  const body = String(req.body?.body || "").trim().slice(0, 20_000);
  const updated = await db.execute(sql`
    UPDATE chat_space_notes SET title = ${title}, body = ${body}, updated_at = NOW()
    WHERE id = ${noteId} AND chat_id = ${chatId}
    RETURNING id, title, body, created_by, updated_at
  `);
  if (!updated.rows.length) return res.status(404).json({ error: "Заметка не найдена" });
  return res.json(updated.rows[0]);
});

router.delete("/chats/:chatId/space/notes/:noteId", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  await db.execute(sql`DELETE FROM chat_space_notes WHERE id = ${Number(req.params.noteId)} AND chat_id = ${chatId}`);
  return res.status(204).end();
});

router.post("/chats/:chatId/space/tasks", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  const title = String(req.body?.title || "").trim().slice(0, 240);
  if (!title) return res.status(400).json({ error: "Введите задачу" });
  const inserted = await db.execute(sql`
    INSERT INTO chat_space_tasks (chat_id, title, assignee_id, created_by, due_at)
    VALUES (${chatId}, ${title}, ${req.body?.assigneeId ? Number(req.body.assigneeId) : null}, ${userId},
            ${req.body?.dueAt ? new Date(req.body.dueAt) : null})
    RETURNING id, title, done, assignee_id, created_by, due_at, created_at
  `);
  return res.status(201).json(inserted.rows[0]);
});

router.patch("/chats/:chatId/space/tasks/:taskId", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  const updated = await db.execute(sql`
    UPDATE chat_space_tasks
    SET done = COALESCE(${typeof req.body?.done === "boolean" ? req.body.done : null}, done),
        assignee_id = COALESCE(${req.body?.assigneeId ? Number(req.body.assigneeId) : null}, assignee_id),
        title = COALESCE(${req.body?.title ? String(req.body.title).trim().slice(0, 240) : null}, title)
    WHERE id = ${Number(req.params.taskId)} AND chat_id = ${chatId}
    RETURNING id, title, done, assignee_id, created_by, due_at, created_at
  `);
  if (!updated.rows.length) return res.status(404).json({ error: "Задача не найдена" });
  return res.json(updated.rows[0]);
});

router.delete("/chats/:chatId/space/tasks/:taskId", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  await db.execute(sql`DELETE FROM chat_space_tasks WHERE id = ${Number(req.params.taskId)} AND chat_id = ${chatId}`);
  return res.status(204).end();
});

// Shared media view. Bytes remain in the existing message storage path.
router.get("/chats/:chatId/media", async (req, res) => {
  const userId = auth(req);
  const chatId = Number(req.params.chatId);
  if (!userId || !(await isMember(chatId, userId))) return res.status(403).json({ error: "Нет доступа" });
  const result = await db.execute(sql`
    SELECT id, type, media_url, text, sender_id, created_at
    FROM messages
    WHERE chat_id = ${chatId} AND is_deleted = FALSE
      AND (
        type IN ('image', 'album', 'video', 'document', 'audio', 'sticker')
        OR (text IS NOT NULL AND text ~* 'https?://[^[:space:]]+')
      )
    ORDER BY created_at DESC
    LIMIT 300
  `);
  return res.json(result.rows);
});

// Public profile data intentionally excludes private contact/security fields.
router.get("/public/users/:username", async (req, res) => {
  const username = String(req.params.username || "").trim().toLowerCase();
  const result = await db.execute(sql`
    SELECT id, username, display_name, bio, avatar_url, avatar_color, status_text,
           is_verified, is_developer, is_youtube_creator, is_tiktok_creator, created_at
    FROM users WHERE LOWER(username) = ${username} LIMIT 1
  `);
  if (!result.rows.length) return res.status(404).json({ error: "Профиль не найден" });
  return res.json(result.rows[0]);
});

router.get("/achievements/me", async (req, res) => {
  const userId = auth(req);
  const [messages, calls, reactions, contacts, stories] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS count FROM messages WHERE sender_id = ${userId}`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM calls WHERE caller_id = ${userId} OR callee_id = ${userId}`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM reactions WHERE user_id = ${userId}`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM contacts WHERE user_id = ${userId}`),
    db.execute(sql`SELECT COUNT(*)::int AS count FROM stories WHERE user_id = ${userId}`),
  ]);
  const value = (rows: any[]) => Number((rows[0] as any)?.count || 0);
  const stats = {
    messages: value(messages.rows), calls: value(calls.rows), reactions: value(reactions.rows),
    contacts: value(contacts.rows), stories: value(stories.rows),
  };
  const achievements = [
    { id: "first-message", icon: "💬", title: "Первый контакт", description: "Отправьте первое сообщение", target: 1, value: stats.messages, metric: "messages" },
    { id: "social", icon: "🤝", title: "Социальный круг", description: "Добавьте 5 контактов", target: 5, value: stats.contacts, metric: "contacts" },
    { id: "voice", icon: "📞", title: "На связи", description: "Совершите 3 звонка", target: 3, value: stats.calls, metric: "calls" },
    { id: "reaction", icon: "✨", title: "Эмоция", description: "Поставьте 10 реакций", target: 10, value: stats.reactions, metric: "reactions" },
    { id: "story", icon: "🌟", title: "В эфире", description: "Опубликуйте 3 истории", target: 3, value: stats.stories, metric: "stories" },
    { id: "chatter", icon: "🚀", title: "Активный автор", description: "Отправьте 100 сообщений", target: 100, value: stats.messages, metric: "messages" },
  ].map(item => ({ ...item, completed: item.value >= item.target, progress: Math.min(100, Math.round((item.value / item.target) * 100)) }));
  return res.json({ stats, achievements });
});

export default router;