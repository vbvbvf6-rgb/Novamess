import { Router } from "express";
import { db, messagesTable, reactionsTable, usersTable, chatMembersTable, chatsTable } from "@workspace/db";
import { eq, and, lt, desc, sql, lte } from "drizzle-orm";
import { spawn } from "node:child_process";
import { broadcastToChat, broadcastToUser } from "../lib/sse";
import { sendPushToUser } from "./push";
import { SendMessageBody, EditMessageBody, AddReactionBody } from "@workspace/api-zod";

async function isAdmin(userId: number): Promise<boolean> {
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

  let pollData: any = null;
  if (msg.type === "poll") {
    try {
      const pollRows = await db.execute(sql`SELECT * FROM polls WHERE message_id = ${msg.id} LIMIT 1`);
      const poll = pollRows.rows[0] as any;
      if (poll) {
        const voteRows = await db.execute(sql`
          SELECT pv.*, u.display_name, u.avatar_color FROM poll_votes pv
          JOIN users u ON u.id = pv.user_id WHERE pv.poll_id = ${poll.id}
        `);
        const opts: string[] = typeof poll.options === "string" ? JSON.parse(poll.options) : (poll.options || []);
        pollData = { ...poll, options: opts, votes: voteRows.rows };
      }
    } catch {}
  }

  return {
    ...msg,
    sender,
    reactions: reactions.map(r => ({ ...r.reaction, user: r.user })),
    replyTo,
    giftData: null,
    pollData,
  };
}

router.get("/messages/search", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const q = String(req.query.q ?? "").trim();
    const chatId = req.query.chatId ? Number(req.query.chatId) : undefined;
    const limit = Math.min(Number(req.query.limit ?? 30), 100);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Запрос слишком короткий" });
    }

    if (chatId) {
      if (!(await isChatMember(chatId, uid))) {
        return res.status(403).json({ error: "Нет доступа к этому чату" });
      }
      const rows = await db.execute(
        sql`SELECT m.*, u.id as sender_id_u, u.display_name, u.avatar_color, u.avatar_url, u.is_verified, u.is_bot,
                   c.name as chat_name, c.type as chat_type
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            JOIN chats c ON c.id = m.chat_id
            WHERE m.chat_id = ${chatId}
              AND m.text ILIKE ${'%' + q + '%'}
            ORDER BY m.created_at DESC
            LIMIT ${limit}`
      );
      return res.json(rows.rows);
    }

    const rows = await db.execute(
      sql`SELECT m.*, u.display_name, u.avatar_color, u.avatar_url, u.is_verified, u.is_bot,
                 c.name as chat_name, c.type as chat_type,
                 cu.display_name as other_user_name
          FROM messages m
          JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = ${uid}
          JOIN users u ON u.id = m.sender_id
          JOIN chats c ON c.id = m.chat_id
          LEFT JOIN chat_members cm2 ON cm2.chat_id = m.chat_id AND cm2.user_id != ${uid} AND c.type = 'direct'
          LEFT JOIN users cu ON cu.id = cm2.user_id
          WHERE m.text ILIKE ${'%' + q + '%'}
          ORDER BY m.created_at DESC
          LIMIT ${limit}`
    );
    return res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
      const deleted = await db.delete(messagesTable).where(
        and(eq(messagesTable.chatId, chatId), lte(messagesTable.createdAt, cutoff))
      ).returning({ id: messagesTable.id });
      if (deleted.length > 0) {
        for (const { id } of deleted) {
          broadcastToChat(chatId, "message-deleted", { messageId: id, chatId });
        }
      }
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

    // Notify all other members via user-level SSE for global push notifications
    setImmediate(async () => {
      try {
        const chatMembers = await db.execute(
          sql`SELECT u.id, u.display_name FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.chat_id = ${body.chatId} AND cm.user_id != ${uid}`
        );
        const senderRow = await db.execute(sql`SELECT display_name FROM users WHERE id = ${uid} LIMIT 1`);
        const senderName = (senderRow.rows[0] as any)?.display_name || "Pulse";
        const msgBody = body.type === "image" ? "📷 Фото" : body.type === "audio" ? "🎤 Голосовое" : (body.text || "");
        for (const member of chatMembers.rows as any[]) {
          broadcastToUser(member.id, "new-message", {
            messageId: msg.id,
            chatId: body.chatId,
            senderName,
            body: msgBody,
          });
          sendPushToUser(member.id, {
            title: senderName,
            body: msgBody,
            url: "/",
            tag: `chat-${body.chatId}`,
          });
        }
      } catch {}
    });

    if ((body.type === "text" && body.text) || (body.type === "image" && body.mediaUrl)) {
      setImmediate(async () => {
        try {
          const members = await db.execute(
            sql`SELECT u.id, u.is_bot, u.username FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.chat_id = ${body.chatId} AND cm.user_id != ${uid}`
          );
          const bot = (members.rows as any[]).find(m => m.is_bot);
          if (!bot) return;

          // User-created bots only handle text messages
          const isImageMessage = body.type === "image" && !!body.mediaUrl;

          // Route to user-created bot via update queue (text only)
          const tokenRow = await db.execute(sql`SELECT id, inline_code FROM bot_tokens WHERE bot_user_id = ${bot.id}`);
          if ((tokenRow.rows as any[]).length > 0 && !isImageMessage) {
            const { inline_code } = tokenRow.rows[0] as any;
            const countRow = await db.execute(sql`SELECT COALESCE(MAX(update_id),0) as mx FROM bot_updates WHERE bot_user_id = ${bot.id}`);
            const nextId = Number((countRow.rows[0] as any)?.mx ?? 0) + 1;
            const senderRow = await db.execute(sql`SELECT id, username, display_name FROM users WHERE id = ${uid}`);
            const sender = senderRow.rows[0] as any;
            const chatRow = await db.execute(sql`SELECT id, type, name FROM chats WHERE id = ${body.chatId}`);
            const chat = chatRow.rows[0] as any;
            const payload = {
              message: {
                message_id: msg.id,
                from: { id: sender?.id, is_bot: false, first_name: sender?.display_name || sender?.username, username: sender?.username },
                chat: { id: chat?.id, type: chat?.type === "direct" ? "private" : (chat?.type || "private"), title: chat?.name },
                date: Math.floor(Date.now() / 1000),
                text: body.text,
              }
            };
            await db.execute(sql`INSERT INTO bot_updates (bot_user_id, update_id, payload) VALUES (${bot.id}, ${nextId}, ${JSON.stringify(payload)})`);

            // ── Inline Python execution ─────────────────────────────────
            if (inline_code && typeof inline_code === "string" && inline_code.trim()) {
              const harness = `import sys as _sys, json as _json
_upd = _json.loads(_sys.stdin.read())
message = _upd.get('message', {})
text = message.get('text', '')
chat_id = message.get('chat', {}).get('id', 0)
sender = message.get('from', {})
${inline_code}
`;
              const pyResult = await new Promise<{ out: string; err: string; killed: boolean }>((resolve) => {
                let out = "", err = "";
                let killed = false;
                const py = spawn("python3", ["-c", harness]);
                const timer = setTimeout(() => {
                  killed = true;
                  py.kill("SIGKILL");
                  resolve({ out: "", err: "⏱ Timeout: скрипт выполнялся дольше 10 секунд и был остановлен.", killed: true });
                }, 10000);
                py.stdout.on("data", (d: Buffer) => { out += d.toString(); });
                py.stderr.on("data", (d: Buffer) => { err += d.toString(); });
                py.on("close", () => {
                  if (!killed) {
                    clearTimeout(timer);
                    resolve({ out: out.trim(), err: err.trim(), killed: false });
                  }
                });
                py.on("error", (e: Error) => { clearTimeout(timer); resolve({ out: "", err: e.message, killed: false }); });
                try {
                  py.stdin.write(JSON.stringify(payload));
                  py.stdin.end();
                } catch {}
              });

              const replyText = pyResult.out || (pyResult.err ? `🐛 Ошибка в коде бота:\n\`\`\`\n${pyResult.err}\n\`\`\`` : null);

              if (replyText) {
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
                const [botMsg] = await db.insert(messagesTable).values({
                  chatId: body.chatId,
                  senderId: bot.id,
                  text: replyText,
                  type: "text",
                }).returning();
                broadcastToChat(body.chatId, "new-message", { messageId: botMsg.id, chatId: body.chatId });
              }
              return;
            }

            // ── Webhook delivery (if no inline code) ────────────────────
            const wh = await db.execute(sql`SELECT url, secret_token FROM bot_webhooks WHERE bot_user_id = ${bot.id}`);
            if ((wh.rows as any[]).length > 0) {
              const { url, secret_token } = wh.rows[0] as any;
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              if (secret_token) headers["X-Telegram-Bot-Api-Secret-Token"] = secret_token;
              fetch(url, { method: "POST", headers, body: JSON.stringify({ update_id: nextId, ...payload }) })
                .then(async r => {
                  if (!r.ok) {
                    await db.execute(sql`UPDATE bot_webhooks SET last_error = ${await r.text()}, last_error_at = NOW() WHERE bot_user_id = ${bot.id}`);
                  }
                }).catch(async (e: Error) => {
                  await db.execute(sql`UPDATE bot_webhooks SET last_error = ${e.message}, last_error_at = NOW() WHERE bot_user_id = ${bot.id}`);
                });
              return;
            }

            // ── Default responses (no code, no webhook) ──────────────────
            const botInfoRow = await db.execute(sql`SELECT display_name, bio FROM users WHERE id = ${bot.id}`);
            const botInfo = botInfoRow.rows[0] as any;
            const botName = botInfo?.display_name || "Бот";
            const botBio = botInfo?.bio;
            const txt = (body.text || "").trim();
            let defaultReply: string | null = null;

            if (txt === "/start" || txt.startsWith("/start ")) {
              defaultReply = `👋 Привет! Я ${botName}.\n\n${botBio ? botBio + "\n\n" : ""}Разработчик ещё не настроил мои команды через встроенный редактор кода.\n\n📋 Доступные команды:\n/start — запустить бота\n/help — справка`;
            } else if (txt === "/help") {
              defaultReply = `📋 Справка по боту ${botName}\n\n${botBio ? botBio + "\n\n" : ""}/start — запустить бота\n/help — это сообщение\n\nЧтобы настроить бота, перейди в раздел «Боты» и добавь код обработчика.`;
            } else if (txt.startsWith("/")) {
              defaultReply = `❓ Неизвестная команда «${txt.split(" ")[0]}».\n\nПопробуй /help для списка команд.`;
            } else {
              defaultReply = `🤖 Я ${botName}. Разработчик ещё не настроил мои ответы.\n\nОтправь /start чтобы начать или /help для справки.`;
            }

            if (defaultReply) {
              await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
              const [botMsg] = await db.insert(messagesTable).values({
                chatId: body.chatId,
                senderId: bot.id,
                text: defaultReply,
                type: "text",
              }).returning();
              broadcastToChat(body.chatId, "new-message", { messageId: botMsg.id, chatId: body.chatId });
            }
            return;
          }

          const history = await db.select().from(messagesTable)
            .where(eq(messagesTable.chatId, body.chatId))
            .orderBy(desc(messagesTable.createdAt))
            .limit(10);

          const historyMessages = history.reverse().slice(0, -1).map((m: any) => ({
            role: m.senderId === bot.id ? "assistant" : "user",
            content: m.text || "",
          }));

          const systemPrompt = `Ты — DeepSeek AI, дружелюбный и умный ИИ-ассистент встроенный в мессенджер Pulse. Отвечай кратко и по делу. По умолчанию всегда отвечай на русском языке. Переходи на другой язык только если пользователь явно написал не по-русски.`;

          // Build user message content — vision format for images, plain text otherwise
          const userContent: any = isImageMessage
            ? [
                { type: "image_url", image_url: { url: body.mediaUrl } },
                { type: "text", text: body.text || "Что изображено на этом фото?" },
              ]
            : (body.text || "");

          const chatPayload = [
            { role: "system", content: systemPrompt },
            ...historyMessages,
            { role: "user", content: userContent },
          ];

          // Use a vision-capable model for images; DeepSeek Chat for plain text
          const aiModel = isImageMessage
            ? "google/gemini-flash-1.5"
            : "deepseek/deepseek-chat-v3-0324:free";

          let reply: string | undefined;

          const tryWithTimeout = async (fn: () => Promise<string | undefined>, ms = 12000) => {
            return Promise.race([
              fn(),
              new Promise<undefined>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
            ]).catch(() => undefined);
          };

          const callPollinations = async (model: string) => {
            const conversationText = historyMessages
              .map((m: any) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
              .join("\n");
            const fullPrompt = conversationText
              ? `${conversationText}\nUser: ${body.text}\nAssistant:`
              : body.text;
            const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt || "")}?model=${model}&system=${encodeURIComponent(systemPrompt)}&seed=${Math.floor(Math.random() * 99999)}`;
            const r = await fetch(url, { method: "GET" });
            if (!r.ok) return undefined;
            const text = await r.text();
            return text?.trim() || undefined;
          };

          if (process.env.OPENROUTER_API_KEY) {
            reply = await tryWithTimeout(async () => {
              const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  "HTTP-Referer": "https://pulse-messenger.replit.app",
                  "X-Title": "Pulse Messenger",
                },
                body: JSON.stringify({ model: aiModel, messages: chatPayload, max_tokens: 500 }),
              });
              const data = await r.json() as any;
              return data.choices?.[0]?.message?.content as string | undefined;
            });
          }

          // Pollinations fallback — run both models in parallel, take the first valid reply
          if (!reply && !isImageMessage) {
            const settled = await Promise.allSettled([
              tryWithTimeout(() => callPollinations("openai"), 7000),
              tryWithTimeout(() => callPollinations("mistral"), 7000),
            ]);
            for (const r of settled) {
              if (r.status === "fulfilled" && r.value) { reply = r.value; break; }
            }
          }

          if (!reply || typeof reply !== "string" || !reply.trim()) return;

          await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
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

router.post("/messages/schedule", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const primeRow = await db.execute(sql`SELECT has_prime, prime_expires_at FROM users WHERE id = ${uid}`);
    const pu = primeRow.rows[0] as any;
    const hasPrime = (pu?.has_prime === true || pu?.has_prime === "t") && pu?.prime_expires_at && new Date(pu.prime_expires_at) > new Date();
    if (!hasPrime) return res.status(403).json({ error: "Отложенная отправка доступна только для Pulse Prime участников" });

    const { chatId, text, scheduledAt } = req.body;
    if (!chatId || !text || !scheduledAt) return res.status(400).json({ error: "chatId, text и scheduledAt обязательны" });
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()) || date <= new Date()) return res.status(400).json({ error: "Дата должна быть в будущем" });
    if (!(await isChatMember(Number(chatId), uid))) return res.status(403).json({ error: "Нет доступа к этому чату" });

    const rows = await db.execute(sql`
      INSERT INTO scheduled_messages (chat_id, sender_id, text, scheduled_at)
      VALUES (${Number(chatId)}, ${uid}, ${String(text).trim()}, ${date.toISOString()})
      RETURNING *
    `);
    res.status(201).json(rows.rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/messages/scheduled", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = req.query.chatId ? Number(req.query.chatId) : undefined;
    const rows = chatId
      ? await db.execute(sql`SELECT * FROM scheduled_messages WHERE sender_id = ${uid} AND chat_id = ${chatId} AND scheduled_at > NOW() ORDER BY scheduled_at ASC`)
      : await db.execute(sql`SELECT * FROM scheduled_messages WHERE sender_id = ${uid} AND scheduled_at > NOW() ORDER BY scheduled_at ASC`);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/messages/scheduled/:id", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const id = Number(req.params.id);
    await db.execute(sql`DELETE FROM scheduled_messages WHERE id = ${id} AND sender_id = ${uid}`);
    res.status(204).send();
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

    await db.execute(sql`UPDATE messages SET is_deleted = true, text = NULL, media_url = NULL WHERE id = ${messageId}`);
    broadcastToChat(existing.chatId, "new-message", { messageId, chatId: existing.chatId });
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
