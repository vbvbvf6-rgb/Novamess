import { Router } from "express";
import { db, messagesTable, reactionsTable, usersTable, chatMembersTable, chatsTable } from "@workspace/db";
import { eq, and, lt, desc, sql, lte } from "drizzle-orm";
import { broadcastToChat } from "../lib/sse";
import { SendMessageBody, EditMessageBody, AddReactionBody } from "@workspace/api-zod";

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
    const limit = Number(req.query.limit ?? 50);
    const before = req.query.before ? Number(req.query.before) : undefined;

    // Auto-delete cleanup: remove expired messages for this chat
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

    // Broadcast new message to SSE subscribers
    broadcastToChat(body.chatId, "new-message", { messageId: msg.id, chatId: body.chatId });

    // Auto-reply from bot if chat has a bot member
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
          })).filter((m: any) => m.content);

          const pulseContext = `Pulse — мессенджер с функциями: чаты (личные, группы, каналы), звонки (аудио и видео), подарки с анимацией (обычные/редкие/эпические/легендарные), истории (24ч), контакты, лента постов, кошелёк Spark, подписка Pulse Prime. Текущий пользователь — обычный пользователь. Ты встроен в интерфейс чата.`;
          const systemPrompt = bot.username === "deepseek_ai"
            ? `Ты — дружелюбный и умный ИИ-помощник в мессенджере Pulse. Отвечай по-русски, кратко и по существу. ${pulseContext} Помогай с любыми вопросами — о мессенджере и не только.`
            : `Ты — помощник службы поддержки мессенджера Pulse. Отвечай дружелюбно и по-русски. ${pulseContext} Помогай пользователям разобраться с функциями приложения.`;

          const openRouterKey = process.env["OPENROUTER_API_KEY"];
          let reply: string | undefined;

          const msgs = [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: body.text },
          ];

          const callPollinations = async (): Promise<string | undefined> => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000);
            try {
              const response = await fetch("https://text.pollinations.ai/openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                  model: "openai",
                  messages: msgs,
                  max_tokens: 600,
                  temperature: 0.7,
                  private: true,
                }),
              });
              if (response.ok) {
                const data = await response.json() as any;
                return data.choices?.[0]?.message?.content as string | undefined;
              }
            } catch {}
            finally { clearTimeout(timer); }
            return undefined;
          };

          if (openRouterKey) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 20000);
              const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${openRouterKey}`,
                  "HTTP-Referer": "https://pulse-messenger.replit.app",
                  "X-Title": "Pulse Messenger",
                },
                signal: controller.signal,
                body: JSON.stringify({
                  model: "google/gemini-flash-1.5",
                  messages: msgs,
                  max_tokens: 800,
                  temperature: 0.7,
                }),
              });
              clearTimeout(timer);
              if (response.ok) {
                const data = await response.json() as any;
                reply = data.choices?.[0]?.message?.content as string | undefined;
              }
            } catch {}
            if (!reply) reply = await callPollinations();
          } else {
            reply = await callPollinations();
          }

          if (!reply || typeof reply !== "string" || !reply.trim()) return;

          await db.insert(messagesTable).values({
            chatId: body.chatId,
            senderId: bot.id,
            text: reply,
            type: "text",
          });
          broadcastToChat(body.chatId, "new-message", { chatId: body.chatId });
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
    const body = EditMessageBody.parse(req.body);
    const [msg] = await db.update(messagesTable)
      .set({ text: body.text, isEdited: true })
      .where(eq(messagesTable.id, messageId))
      .returning();
    const built = await buildMessage(msg);
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/messages/:messageId", async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    await db.delete(reactionsTable).where(eq(reactionsTable.messageId, messageId));
    await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
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
    const [reaction] = await db.insert(reactionsTable).values({
      messageId,
      userId: uid,
      emoji: body.emoji,
    }).returning();
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
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
