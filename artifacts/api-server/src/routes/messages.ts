import { Router } from "express";
import { db, messagesTable, reactionsTable, usersTable, chatMembersTable, chatsTable } from "@workspace/db";
import { eq, and, lt, desc, sql, lte } from "drizzle-orm";
import { broadcastToChat } from "../lib/sse";
import { SendMessageBody, EditMessageBody, AddReactionBody } from "@workspace/api-zod";

const ADMIN_USER_IDS = [4];

async function isAdmin(userId: number): Promise<boolean> {
  if (ADMIN_USER_IDS.includes(userId)) return true;
  try {
    const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId}`);
    return !!(rows.rows[0] as any)?.is_admin;
  } catch { return false; }
}

async function isChatMember(chatId: number, userId: number): Promise<boolean> {
  const member = await db.query.chatMembersTable.findFirst({
    where: and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, userId)),
  });
  return !!member;
}

const router = Router();

async function buildMessage(msg: typeof messagesTable.$inferSelect) {
  const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, msg.senderId) });
  const reactions = await db.select({
    reaction: reactionsTable,
    user: usersTable,
  }).from(reactionsTable)
    .leftJoin(usersTable, eq(reactionsTable.userId, usersTable.id))
    .where(eq(reactionsTable.messageId, msg.id));

  let replyTo = null;
  if (msg.replyToId) {
    const reply = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, msg.replyToId) });
    if (reply) {
      const replySender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, reply.senderId) });
      replyTo = { ...reply, sender: replySender, reactions: [], replyTo: null, giftData: null };
    }
  }

  return {
    ...msg,
    sender,
    reactions: reactions.map(r => ({ ...r.reaction, user: r.user })),
    replyTo,
    giftData: null,
  };
}

router.get("/messages", async (req, res) => {
  try {
    const chatId = Number(req.query.chatId);
    const uid = req.currentUserId;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const before = req.query.before ? Number(req.query.before) : undefined;

    if (!chatId || isNaN(chatId)) {
      return res.status(400).json({ error: "Укажите chatId" });
    }

    const memberCheck = await isChatMember(chatId, uid);
    if (!memberCheck) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }

    const chat = await db.query.chatsTable.findFirst({ where: eq(chatsTable.id, chatId) });
    if (chat?.autoDeleteTimer) {
      const cutoff = new Date(Date.now() - chat.autoDeleteTimer * 1000);
      await db.delete(messagesTable).where(
        and(eq(messagesTable.chatId, chatId), lte(messagesTable.createdAt, cutoff))
      );
    }

    let query = db.select().from(messagesTable).where(eq(messagesTable.chatId, chatId));
    if (before) {
      query = db.select().from(messagesTable).where(
        and(eq(messagesTable.chatId, chatId), lt(messagesTable.id, before))
      );
    }

    const msgs = await query.orderBy(desc(messagesTable.createdAt)).limit(limit);
    const built = await Promise.all(msgs.reverse().map(buildMessage));
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = SendMessageBody.parse(req.body);

    if (!(await isChatMember(body.chatId, uid))) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }

    if (body.text && body.text.length > 4000) {
      return res.status(400).json({ error: "Сообщение слишком длинное (максимум 4000 символов)" });
    }

    const [msg] = await db.insert(messagesTable).values({
      chatId: body.chatId,
      senderId: uid,
      text: body.text,
      type: body.type ?? "text",
      mediaUrl: body.mediaUrl,
      replyToId: body.replyToId,
    }).returning();
    const built = await buildMessage(msg);
    res.status(201).json(built);

    broadcastToChat(body.chatId, "new-message", { messageId: msg.id, chatId: body.chatId });

    if (body.type === "text" && body.text) {
      setImmediate(async () => {
        try {
          const members = await db.execute(
            sql`SELECT u.id, u.is_bot, u.username FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.chat_id = ${body.chatId} AND cm.user_id != ${uid}`
          );
          const bot = (members.rows as any[]).find(m => m.is_bot);
          if (!bot) return;

          const history = await db.select().from(messagesTable)
            .where(eq(messagesTable.chatId, body.chatId))
            .orderBy(desc(messagesTable.createdAt))
            .limit(10);

          const historyMessages = history.reverse().slice(0, -1).map((m: any) => ({
            role: m.senderId === bot.id ? "assistant" : "user",
            content: m.text || "",
          }));

          const systemPrompt = `You are DeepSeek AI, a helpful and friendly AI assistant built into Pulse Messenger. Be concise and helpful. Always reply in the same language the user writes in.`;
          const chatPayload = [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: body.text },
          ];

          let reply: string | undefined;

          const tryWithTimeout = async (fn: () => Promise<string | undefined>, ms = 12000) => {
            return Promise.race([
              fn(),
              new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
            ]).catch(() => undefined);
          };

          const callPollinations = async (model: string) => {
            const r = await fetch("https://text.pollinations.ai/openai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model, messages: chatPayload, max_tokens: 500 }),
            });
            if (!r.ok) return undefined;
            const data = await r.json();
            return data.choices?.[0]?.message?.content as string | undefined;
          };

          if (process.env.DEEPSEEK_API_KEY) {
            reply = await tryWithTimeout(async () => {
              const r = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
                body: JSON.stringify({ model: "deepseek-chat", messages: chatPayload, max_tokens: 500 }),
              });
              const data = await r.json();
              return data.choices?.[0]?.message?.content as string | undefined;
            });
          }

          if (!reply) reply = await tryWithTimeout(() => callPollinations("openai"));
          if (!reply) reply = await tryWithTimeout(() => callPollinations("mistral"));

          if (!reply || typeof reply !== "string" || !reply.trim()) return;

          await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
          const [botMsg] = await db.insert(messagesTable).values({
            chatId: body.chatId,
            senderId: bot.id,
            text: reply.trim(),
            type: "text",
          }).returning();
          broadcastToChat(body.chatId, "new-message", { messageId: botMsg.id, chatId: body.chatId });
        } catch {}
      });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/messages/:messageId", async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const uid = req.currentUserId;

    const existing = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, messageId) });
    if (!existing) return res.status(404).json({ error: "Сообщение не найдено" });
    if (existing.senderId !== uid) return res.status(403).json({ error: "Нельзя редактировать чужое сообщение" });

    const body = EditMessageBody.parse(req.body);
    if (body.text && body.text.length > 4000) {
      return res.status(400).json({ error: "Сообщение слишком длинное (максимум 4000 символов)" });
    }

    const [msg] = await db.update(messagesTable)
      .set({ text: body.text, isEdited: true })
      .where(eq(messagesTable.id, messageId))
      .returning();
    const built = await buildMessage(msg);
    broadcastToChat(msg.chatId, "new-message", { messageId: msg.id, chatId: msg.chatId });
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/messages/:messageId", async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const uid = req.currentUserId;

    const existing = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, messageId) });
    if (!existing) return res.status(404).json({ error: "Сообщение не найдено" });

    const admin = await isAdmin(uid);
    if (existing.senderId !== uid && !admin) {
      return res.status(403).json({ error: "Нельзя удалить чужое сообщение" });
    }

    await db.delete(reactionsTable).where(eq(reactionsTable.messageId, messageId));
    await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
    broadcastToChat(existing.chatId, "new-message", { messageId, chatId: existing.chatId, deleted: true });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/messages/:messageId/reactions", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const messageId = Number(req.params.messageId);
    const body = AddReactionBody.parse(req.body);

    const existing = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, messageId) });
    if (!existing) return res.status(404).json({ error: "Сообщение не найдено" });
    if (!(await isChatMember(existing.chatId, uid))) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }

    const [reaction] = await db.insert(reactionsTable).values({
      messageId,
      userId: uid,
      emoji: body.emoji,
    }).returning();
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    broadcastToChat(existing.chatId, "new-message", { messageId, chatId: existing.chatId });
    res.status(201).json({ ...reaction, user });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/messages/:messageId/reactions", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const messageId = Number(req.params.messageId);
    const body = AddReactionBody.parse(req.body);

    await db.delete(reactionsTable).where(
      and(
        eq(reactionsTable.messageId, messageId),
        eq(reactionsTable.userId, uid),
        eq(reactionsTable.emoji, body.emoji)
      )
    );
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
