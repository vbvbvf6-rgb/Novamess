import { Router } from "express";
import { db, messagesTable, reactionsTable, usersTable, chatMembersTable, chatsTable } from "@workspace/db";
import { eq, and, lt, desc, sql, lte, gt, ne, inArray } from "drizzle-orm";
import { getBanwords, findBanword } from "../lib/banwords";
import { localModerationCheck } from "../lib/moderation";
import { spawn } from "node:child_process";
import { broadcastToChat, broadcastToUser } from "../lib/sse";
import { sendPushToUser } from "./push";
import { SendMessageBody, EditMessageBody, AddReactionBody } from "@workspace/api-zod";
import { offloadDataUrl } from "../lib/objectStorage";

// Global Pollinations rate limiter — max 1 concurrent request per server process
let _pollinationsLocked = false;
const _pollinationsQueue: Array<() => void> = [];
function acquirePollinationsLock(): Promise<void> {
  return new Promise(resolve => {
    if (!_pollinationsLocked) { _pollinationsLocked = true; resolve(); }
    else _pollinationsQueue.push(resolve);
  });
}
function releasePollinationsLock() {
  const next = _pollinationsQueue.shift();
  if (next) next(); else _pollinationsLocked = false;
}

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

async function getUserPrimeInfo(userId: number): Promise<{ hasPrime: boolean; isPrimePlus: boolean }> {
  try {
    const row = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${userId}`);
    const u = row.rows[0] as any;
    const hasPrime = (u?.has_prime === true || u?.has_prime === "t") && u?.prime_expires_at && new Date(u.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && u?.prime_tier === "prime_plus";
    return { hasPrime: !!hasPrime, isPrimePlus: !!isPrimePlus };
  } catch { return { hasPrime: false, isPrimePlus: false }; }
}

const router = Router();

async function buildMessage(msg: typeof messagesTable.$inferSelect, viewerIsPrimePlus = false) {
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

  // For deleted messages: only show content to Prime+ users within 48h window
  let maskedText = msg.text;
  let maskedMediaUrl = msg.mediaUrl;
  let deletedContentVisible = false;

  if (msg.isDeleted) {
    const deletedAt = msg.deletedAt ? new Date(msg.deletedAt) : null;
    const withinWindow = deletedAt && (Date.now() - deletedAt.getTime()) < 48 * 60 * 60 * 1000;
    if (viewerIsPrimePlus && withinWindow) {
      // Prime+ can see the content (ghost mode)
      deletedContentVisible = true;
    } else {
      // Regular users see nothing
      maskedText = null;
      maskedMediaUrl = null;
    }
  }

  // Attach prime info to sender for VIP+ badge display
  let senderWithPrime = sender;
  if (sender) {
    try {
      const senderPrimeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${sender.id}`);
      const sp = senderPrimeRow.rows[0] as any;
      const senderHasPrime = (sp?.has_prime === true || sp?.has_prime === "t") && sp?.prime_expires_at && new Date(sp.prime_expires_at) > new Date();
      senderWithPrime = { ...sender, hasPrime: !!senderHasPrime, primeTier: senderHasPrime ? sp?.prime_tier : null, isAdmin: !!(sender as any).is_admin } as any;
    } catch {}
  }

  return {
    ...msg,
    text: maskedText,
    mediaUrl: maskedMediaUrl,
    deletedContentVisible,
    sender: senderWithPrime,
    reactions: reactions.map(r => ({ ...r.reaction, user: r.user })),
    replyTo,
    giftData: null,
    pollData,
  };
}

// ── Batch builder — replaces N+1 with 5 fixed queries for any message list ──
async function buildMessagesBatch(msgs: (typeof messagesTable.$inferSelect)[], viewerIsPrimePlus = false) {
  if (msgs.length === 0) return [];

  const msgIds = msgs.map(m => m.id);
  // Filter out null senderIds (messages from deleted users) to avoid SQL inArray(null) crash
  const senderIds = [...new Set(msgs.map(m => m.senderId).filter((id): id is number => id !== null && id !== undefined))];
  const replyToIds = [...new Set(msgs.map(m => m.replyToId).filter(Boolean) as number[])];

  // 1. Fetch all unique senders in one query
  const senders = senderIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, senderIds))
    : [];
  const senderMap = new Map(senders.map(u => [u.id, u]));

  // 2. Fetch all reactions for all messages in one query
  const allReactions = msgIds.length
    ? await db.select({ reaction: reactionsTable, user: usersTable })
        .from(reactionsTable)
        .leftJoin(usersTable, eq(reactionsTable.userId, usersTable.id))
        .where(inArray(reactionsTable.messageId, msgIds))
    : [];
  const reactionsMap = new Map<number, typeof allReactions>();
  for (const r of allReactions) {
    const mid = r.reaction.messageId;
    if (!reactionsMap.has(mid)) reactionsMap.set(mid, []);
    reactionsMap.get(mid)!.push(r);
  }

  // 3. Fetch all replyTo messages in one query
  const replyMessages = replyToIds.length
    ? await db.select().from(messagesTable).where(inArray(messagesTable.id, replyToIds))
    : [];
  // Filter out null senderIds from reply messages too
  const replySenderIds = [...new Set(replyMessages.map(r => r.senderId).filter((id): id is number => id !== null && id !== undefined))];
  const replyUsers = replySenderIds.length
    ? await db.select().from(usersTable).where(inArray(usersTable.id, replySenderIds))
    : [];
  const replyUserMap = new Map(replyUsers.map(u => [u.id, u]));
  const replyMsgMap = new Map(replyMessages.map(r => [r.id, r]));

  // 4. Fetch poll data for poll messages in one query
  const pollMsgIds = msgs.filter(m => m.type === "poll").map(m => m.id);
  const allPolls = pollMsgIds.length
    ? await db.execute(sql`SELECT * FROM polls WHERE message_id = ANY(ARRAY[${sql.join(pollMsgIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : { rows: [] };
  const pollMap = new Map<number, any>();
  for (const poll of allPolls.rows as any[]) {
    pollMap.set(poll.message_id, poll);
  }
  const pollIds = (allPolls.rows as any[]).map(p => p.id);
  const allVotes = pollIds.length
    ? await db.execute(sql`SELECT pv.*, u.display_name, u.avatar_color FROM poll_votes pv JOIN users u ON u.id = pv.user_id WHERE pv.poll_id = ANY(ARRAY[${sql.join(pollIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
    : { rows: [] };
  const votesMap = new Map<number, any[]>();
  for (const v of allVotes.rows as any[]) {
    if (!votesMap.has(v.poll_id)) votesMap.set(v.poll_id, []);
    votesMap.get(v.poll_id)!.push(v);
  }

  return msgs.map(msg => {
    const sender = senderMap.get(msg.senderId);
    // Prime info + admin flag
    const senderWithPrime = sender
      ? {
          ...sender,
          hasPrime: !!(sender as any).hasPrime,
          primeTier: (sender as any).primeTier ?? null,
          isAdmin: !!(sender as any).is_admin,
        }
      : null;

    // Deleted message masking
    let maskedText = msg.text;
    let maskedMediaUrl = msg.mediaUrl;
    let deletedContentVisible = false;
    if (msg.isDeleted) {
      const deletedAt = msg.deletedAt ? new Date(msg.deletedAt) : null;
      const withinWindow = deletedAt && (Date.now() - deletedAt.getTime()) < 48 * 60 * 60 * 1000;
      if (viewerIsPrimePlus && withinWindow) {
        deletedContentVisible = true;
      } else {
        maskedText = null;
        maskedMediaUrl = null;
      }
    }

    // replyTo
    let replyTo = null;
    if (msg.replyToId) {
      const reply = replyMsgMap.get(msg.replyToId);
      if (reply) {
        replyTo = { ...reply, sender: replyUserMap.get(reply.senderId) ?? null, reactions: [], replyTo: null, giftData: null };
      }
    }

    // Poll data
    let pollData: any = null;
    if (msg.type === "poll") {
      const poll = pollMap.get(msg.id);
      if (poll) {
        const opts: string[] = typeof poll.options === "string" ? JSON.parse(poll.options) : (poll.options || []);
        pollData = { ...poll, options: opts, votes: votesMap.get(poll.id) ?? [] };
      }
    }

    return {
      ...msg,
      text: maskedText,
      mediaUrl: maskedMediaUrl,
      deletedContentVisible,
      sender: senderWithPrime,
      reactions: (reactionsMap.get(msg.id) ?? []).map(r => ({ ...r.reaction, user: r.user })),
      replyTo,
      giftData: null,
      pollData,
    };
  });
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
              AND m.is_deleted = false
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
          WHERE m.is_deleted = false
            AND m.text ILIKE ${'%' + q + '%'}
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

    const { isPrimePlus } = await getUserPrimeInfo(uid);

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

    // Compute isRead dynamically: a message sent by the current user is "read"
    // if at least one OTHER chat member has lastReadAt >= message.createdAt
    const otherMembers = await db.select({
      lastReadAt: chatMembersTable.lastReadAt,
      lastDeliveredAt: chatMembersTable.lastDeliveredAt,
    }).from(chatMembersTable)
      .where(and(eq(chatMembersTable.chatId, chatId), ne(chatMembersTable.userId, uid)));
    const maxOtherLastRead = otherMembers.reduce((max, m) => {
      const t = m.lastReadAt ? new Date(m.lastReadAt).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    const maxOtherLastDelivered = otherMembers.reduce((max, m) => {
      const t = m.lastDeliveredAt ? new Date(m.lastDeliveredAt).getTime() : 0;
      return t > max ? t : max;
    }, 0);

    const reversed = msgs.reverse();
    const built = await buildMessagesBatch(reversed, isPrimePlus);
    for (let i = 0; i < reversed.length; i++) {
      const m = reversed[i];
      if (m.senderId === uid) {
        built[i].isRead = maxOtherLastRead >= new Date(m.createdAt).getTime();
        (built[i] as any).isDelivered = maxOtherLastDelivered >= new Date(m.createdAt).getTime();
      } else {
        built[i].isRead = true;
        (built[i] as any).isDelivered = true;
      }
    }
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
    const effect = typeof req.body.effect === "string" ? req.body.effect : null;

    if (!(await isChatMember(body.chatId, uid))) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }

    // Channel restriction: only owners/admins can post standalone messages; everyone else can only comment (reply)
    const chatInfo = await db.query.chatsTable.findFirst({ where: eq(chatsTable.id, body.chatId) });
    if (chatInfo?.type === "channel" && !body.replyToId) {
      const memberInfo = await db.query.chatMembersTable.findFirst({
        where: and(eq(chatMembersTable.chatId, body.chatId), eq(chatMembersTable.userId, uid)),
      });
      const userAdminRow = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${uid}`);
      const isGlobalAdmin = !!(userAdminRow.rows[0] as any)?.is_admin;
      if (!isGlobalAdmin && memberInfo?.role !== "owner" && memberInfo?.role !== "admin") {
        return res.status(403).json({ error: "Только администраторы могут публиковать в этом канале" });
      }
    }

    // Slow mode enforcement (use raw SQL since slow_mode may not be in Drizzle schema)
    const slowModeRow = await db.execute(sql`SELECT slow_mode FROM chats WHERE id = ${body.chatId}`);
    const slowModeSec: number = (slowModeRow.rows[0] as any)?.slow_mode ?? 0;
    if (slowModeSec > 0) {
      const memberInfo2 = await db.query.chatMembersTable.findFirst({
        where: and(eq(chatMembersTable.chatId, body.chatId), eq(chatMembersTable.userId, uid)),
      });
      const isOwnerOrAdmin = memberInfo2?.role === "owner" || memberInfo2?.role === "admin";
      if (!isOwnerOrAdmin) {
        const lastMsgRow = await db.execute(
          sql`SELECT created_at FROM messages WHERE chat_id = ${body.chatId} AND sender_id = ${uid} ORDER BY created_at DESC LIMIT 1`
        );
        const lastMsgAt = (lastMsgRow.rows[0] as any)?.created_at;
        if (lastMsgAt) {
          const secSince = (Date.now() - new Date(lastMsgAt).getTime()) / 1000;
          if (secSince < slowModeSec) {
            const wait = Math.ceil(slowModeSec - secSince);
            return res.status(429).json({ error: `Медленный режим: подождите ещё ${wait} сек.` });
          }
        }
      }
    }

    const isTextMessage = !body.type || body.type === "text";
    if (isTextMessage && body.text && body.text.length > 4000) {
      return res.status(400).json({ error: "Сообщение слишком длинное (максимум 4000 символов)" });
    }

    // ── Server-side media size limits ──────────────────────────────────────
    // Base64 inflates file size by ~33%, so 1 MB file ≈ 1.37 MB base64 string.
    // Images: 3 MB base64 (~2.2 MB actual). Videos: 15 MB base64 (~11 MB actual).
    if (body.mediaUrl && body.mediaUrl.startsWith("data:")) {
      const byteLen = body.mediaUrl.length;
      const isVideo = body.mediaUrl.startsWith("data:video");
      const isAudio = body.mediaUrl.startsWith("data:audio");
      const MAX_IMAGE = 3 * 1024 * 1024;   // 3 MB base64
      const MAX_VIDEO = 15 * 1024 * 1024;  // 15 MB base64
      const MAX_AUDIO = 4 * 1024 * 1024;   // 4 MB base64
      const limit = isVideo ? MAX_VIDEO : isAudio ? MAX_AUDIO : MAX_IMAGE;
      if (byteLen > limit) {
        const limitMB = Math.round(limit / 1024 / 1024);
        return res.status(413).json({ error: `Файл слишком большой. Максимум ${limitMB} МБ.` });
      }
    }

    // Banword check
    if (body.text) {
      const banwords = await getBanwords();
      const hit = findBanword(body.text, banwords);
      if (hit) {
        return res.status(400).json({ error: "Сообщение содержит запрещённое слово и не может быть отправлено." });
      }
    }

    // Instant local moderation check (regex patterns, no latency)
    if (body.text && body.text.trim().length >= 5) {
      const localResult = localModerationCheck(body.text);
      if (localResult?.flagged) {
        return res.status(400).json({
          error: `Сообщение нарушает правила платформы и не может быть отправлено. ${localResult.reason || ""}`.trim(),
          moderation: { flagged: true, categories: localResult.categories, reason: localResult.reason },
        });
      }
    }

    // Validate effect (only Prime+ can use effects)
    let allowedEffect: string | null = null;
    if (effect && ["confetti", "snow", "fire"].includes(effect)) {
      const { isPrimePlus } = await getUserPrimeInfo(uid);
      if (isPrimePlus) allowedEffect = effect;
    }

    const offloadedMediaUrl = await offloadDataUrl(body.mediaUrl, "messages");

    const [msg] = await db.insert(messagesTable).values({
      chatId: body.chatId,
      senderId: uid,
      text: body.text,
      type: body.type ?? "text",
      mediaUrl: offloadedMediaUrl,
      replyToId: body.replyToId,
      effect: allowedEffect,
    }).returning();

    // Fast build: run queries in parallel, skip reactions (always empty for brand-new messages)
    const [sender, replyToMsg] = await Promise.all([
      db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) }),
      body.replyToId
        ? db.query.messagesTable.findFirst({ where: eq(messagesTable.id, body.replyToId) })
        : Promise.resolve(null),
    ]);
    let replyTo: any = null;
    if (replyToMsg) {
      const replySender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, replyToMsg.senderId) });
      replyTo = { ...replyToMsg, sender: replySender, reactions: [], replyTo: null, giftData: null };
    }
    const built: any = { ...msg, sender, reactions: [], replyTo, giftData: null, pollData: null };
    res.status(201).json(built);

    broadcastToChat(body.chatId, "new-message", { messageId: msg.id, chatId: body.chatId });


    // Log spark activity for sending a message
    setImmediate(async () => {
      try {
        await db.execute(sql`
          INSERT INTO spark_activity (user_id, type, amount, description)
          VALUES (${uid}, 'message_sent', 0, 'Сообщение отправлено')
        `).catch(() => {});
      } catch {}
    });

    // Notify all other members via user-level SSE for global push notifications
    setImmediate(async () => {
      try {
        const chatMembers = await db.execute(
          sql`SELECT u.id, u.display_name FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.chat_id = ${body.chatId} AND cm.user_id != ${uid}`
        );
        const senderRow = await db.execute(
          sql`SELECT display_name, avatar_url, avatar_color FROM users WHERE id = ${uid} LIMIT 1`
        );
        const senderInfo = senderRow.rows[0] as any;
        const senderName = senderInfo?.display_name || "Aura";
        const senderAvatar = senderInfo?.avatar_url || null;
        const senderColor = senderInfo?.avatar_color || "#6366f1";

        const chatRow = await db.execute(
          sql`SELECT name, type, avatar_url FROM chats WHERE id = ${body.chatId} LIMIT 1`
        );
        const chatInfo = chatRow.rows[0] as any;
        const chatType = chatInfo?.type || "direct";
        const chatAvatar = chatInfo?.avatar_url || null;

        const effectLabel = allowedEffect === "confetti" ? " 🎊" : allowedEffect === "snow" ? " ❄️" : allowedEffect === "fire" ? " 🔥" : "";
        const msgBody = body.type === "image" ? "📷 Фото"
          : body.type === "album" ? "📷 Фото"
          : body.type === "audio" ? "🎤 Голосовое"
          : body.type === "document" ? "📎 Файл"
          : body.type === "sticker" ? "🎨 Стикер"
          : body.type === "video" ? "🎥 Видео"
          : (body.text || "") + effectLabel;

        // For group/channel: title = chatName, icon = chatAvatar; for direct: title = senderName, icon = senderAvatar
        const notifTitle = chatType === "direct" ? senderName : (chatInfo?.name || senderName);
        const notifIcon = chatType === "direct" ? senderAvatar : chatAvatar;
        const notifBody = chatType === "direct" ? msgBody : `${senderName}: ${msgBody}`;

        for (const member of chatMembers.rows as any[]) {
          broadcastToUser(member.id, "new-message", {
            messageId: msg.id,
            chatId: body.chatId,
            senderName,
            body: msgBody,
          });
          // Don't push to the sender themselves
          if (member.id === uid) continue;
          sendPushToUser(member.id, {
            title: notifTitle,
            body: notifBody,
            url: "/",
            tag: `chat-${body.chatId}`,
            senderAvatar: notifIcon || undefined,
            senderColor,
            chatType,
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

          const isImageMessage = body.type === "image" && !!body.mediaUrl;

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

          const systemPrompt = `Ты — Nova AI, умный и мгновенный ИИ-ассистент встроенный в мессенджер Nova. Отвечай быстро, кратко и по делу. По умолчанию всегда отвечай на русском языке. Переходи на другой язык только если пользователь явно написал не по-русски.

О мессенджере Nova (отвечай с энтузиазмом, если спрашивают):
- Nova — современный мессенджер с чатами, группами, каналами, голосовыми и видеозвонками
- Истории (Stories) исчезают через 24 часа, как в Instagram
- Prime подписка даёт: просмотр удалённых сообщений (48ч), отложенная отправка, эксклюзивные темы
- Поддерживается 2FA (двухфакторная аутентификация) и PIN-блокировка экрана
- Можно создавать своих ботов с Python-кодом прямо в приложении
- Ты — встроенный ИИ-ассистент, работаешь бесплатно и мгновенно

Стиль ответов: дружелюбно, по существу, без лишней воды.`;

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

          const TIMEOUT_MS = 15000;
          const MAX_TOKENS = 500;

          const callOpenRouter = async (model: string): Promise<string | undefined> => {
            if (!process.env.DEEP_SEEK) return undefined;
            try {
              const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.DEEP_SEEK}`,
                  "HTTP-Referer": "https://pulse-messenger.replit.app",
                  "X-Title": "Pulse Messenger",
                },
                body: JSON.stringify({ model, messages: chatPayload, max_tokens: MAX_TOKENS, temperature: 0.7 }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
              });
              if (!r.ok) return undefined;
              const data = await r.json() as any;
              const txt = data.choices?.[0]?.message?.content as string | undefined;
              return txt?.trim() || undefined;
            } catch { return undefined; }
          };

          // Pollinations: uses global mutex so only 1 request runs at a time server-wide
          const callPollinations = async (model: string): Promise<string | undefined> => {
            if (isImageMessage) return undefined;
            const conversationText = historyMessages
              .map((m: any) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
              .join("\n");
            const fullPrompt = conversationText
              ? `${conversationText}\nUser: ${body.text}\nAssistant:`
              : body.text;
            const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt || "")}?model=${model}&seed=${Math.floor(Math.random() * 99999)}&system=${encodeURIComponent(systemPrompt)}`;
            await acquirePollinationsLock();
            try {
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));
                  const r = await fetch(url, {
                    method: "GET",
                    headers: { "User-Agent": "Mozilla/5.0 (compatible; Pulse-AI/1.0)" },
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                  });
                  if (r.status === 429) continue;
                  if (!r.ok) return undefined;
                  const text = await r.text();
                  const trimmed = text?.trim();
                  if (trimmed) return trimmed;
                } catch { continue; }
              }
              return undefined;
            } finally {
              releasePollinationsLock();
            }
          };

          let reply: string | undefined;
          try {
            // 1. If OpenRouter key is set, race those (they handle parallel fine)
            if (process.env.DEEP_SEEK) {
              const orPromise = new Promise<string | undefined>((resolve) => {
                let settled = 0;
                const models = ["deepseek/deepseek-chat", "google/gemini-flash-1.5", "openai/gpt-4o-mini"];
                for (const m of models) {
                  callOpenRouter(m).then(val => { if (val) resolve(val); else if (++settled === models.length) resolve(undefined); })
                    .catch(() => { if (++settled === models.length) resolve(undefined); });
                }
              });
              reply = await orPromise;
            }

            // 2. If no OpenRouter or it failed, try Pollinations sequentially
            if (!reply) {
              reply = await callPollinations("openai-fast");
            }
            if (!reply) {
              reply = await callPollinations("mistral");
            }
            if (!reply) {
              reply = await callPollinations("phi");
            }
          } catch {}

          if (!reply || typeof reply !== "string" || !reply.trim()) return;

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

router.get("/messages/:messageId/thread", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const messageId = Number(req.params.messageId);
    if (!messageId || isNaN(messageId)) {
      return res.status(400).json({ error: "Invalid messageId" });
    }
    const parentMsg = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, messageId) });
    if (!parentMsg) return res.status(404).json({ error: "Сообщение не найдено" });
    if (!(await isChatMember(parentMsg.chatId, uid))) {
      return res.status(403).json({ error: "Нет доступа" });
    }
    const { isPrimePlus } = await getUserPrimeInfo(uid);
    const replies = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.replyToId, messageId), eq(messagesTable.isDeleted, false)))
      .orderBy(messagesTable.createdAt);
    const built = await Promise.all(replies.map(m => buildMessage(m, isPrimePlus)));
    res.json(built);
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
    const built = await buildMessage(msg, false);
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

    // Store deletedAt timestamp but KEEP content so Prime+ users can view it for 48h
    await db.execute(sql`UPDATE messages SET is_deleted = true, deleted_at = NOW() WHERE id = ${messageId}`);
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

    // Check how many times this user has already reacted with this emoji
    const existingReactions = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM reactions WHERE message_id = ${messageId} AND user_id = ${uid} AND emoji = ${body.emoji}`
    );
    const currentCount = Number((existingReactions.rows[0] as any)?.cnt ?? 0);

    const { isPrimePlus } = await getUserPrimeInfo(uid);
    const maxReactions = isPrimePlus ? 2 : 1;

    if (currentCount >= maxReactions) {
      return res.status(409).json({ error: "Максимальное количество реакций достигнуто" });
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

    const existing = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, messageId) });
    if (existing) broadcastToChat(existing.chatId, "new-message", { messageId, chatId: existing.chatId });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// AI Voice Transcription endpoint
router.post("/messages/transcribe", async (req, res) => {
  try {
    const uid = req.currentUserId;

    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: "messageId обязателен" });

    const msg = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, Number(messageId)) });
    if (!msg || msg.type !== "audio") return res.status(404).json({ error: "Голосовое сообщение не найдено" });

    // Use AI to generate a transcription placeholder
    // In production, integrate with Whisper API
    const transcript = await (async () => {
      const systemPrompt = "Ты — AI система транскрипции голосовых сообщений. Пользователь прислал голосовое сообщение. Напиши реалистичную транскрипцию короткого голосового сообщения (1-3 предложения). Отвечай только текстом транскрипции без пояснений.";
      try {
        if (process.env.DEEP_SEEK) {
          const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEP_SEEK}` },
            body: JSON.stringify({ model: "google/gemini-flash-1.5", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Транскрибируй это голосовое сообщение." }], max_tokens: 100 }),
          });
          const data = await r.json() as any;
          if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
        }
      } catch {}
      return "[Транскрипция временно недоступна]";
    })();

    res.json({ transcript });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
