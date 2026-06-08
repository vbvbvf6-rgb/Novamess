import { Router } from "express";
import { db, chatsTable, chatMembersTable, usersTable, messagesTable, reactionsTable, pinnedMessagesTable } from "@workspace/db";
import { eq, and, desc, inArray, count, gt, ne, sql } from "drizzle-orm";
import { CreateChatBody, UpdateChatBody, AddChatMemberBody } from "@workspace/api-zod";
import { broadcastToChat, setTyping, stopTyping } from "../lib/sse";

const router = Router();

async function getUserPrimeInfo(userId: number): Promise<{ hasPrime: boolean; isPrimePlus: boolean }> {
  try {
    const row = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${userId}`);
    const u = row.rows[0] as any;
    const hasPrime = (u?.has_prime === true || u?.has_prime === "t") && u?.prime_expires_at && new Date(u.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && u?.prime_tier === "prime_plus";
    return { hasPrime: !!hasPrime, isPrimePlus: !!isPrimePlus };
  } catch { return { hasPrime: false, isPrimePlus: false }; }
}

async function buildChat(chatId: number, currentUserId: number) {
  const chat = await db.query.chatsTable.findFirst({ where: eq(chatsTable.id, chatId) });
  if (!chat) return null;

  // Legacy single pinned message support
  let pinnedMessage: any = null;
  if ((chat as any).pinnedMessageId) {
    try {
      const pm = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, (chat as any).pinnedMessageId) });
      if (pm) {
        const pmSender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, pm.senderId) });
        pinnedMessage = { ...pm, sender: pmSender };
      }
    } catch {}
  }

  // Multi-pin support: fetch from pinned_messages table
  let pinnedMessages: any[] = [];
  try {
    const pinnedRows = await db.execute(sql`
      SELECT pm.id as pin_id, pm.pinned_at, pm.pinned_by,
             m.id, m.chat_id, m.sender_id, m.text, m.type, m.media_url, m.created_at, m.is_deleted,
             u.display_name, u.avatar_color
      FROM pinned_messages pm
      JOIN messages m ON m.id = pm.message_id
      JOIN users u ON u.id = m.sender_id
      WHERE pm.chat_id = ${chatId}
      ORDER BY pm.pinned_at DESC
    `);
    pinnedMessages = (pinnedRows.rows as any[]).map(row => ({
      id: row.id,
      pinId: row.pin_id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      text: row.text,
      type: row.type,
      mediaUrl: row.media_url,
      createdAt: row.created_at,
      isDeleted: row.is_deleted,
      pinnedAt: row.pinned_at,
      sender: { displayName: row.display_name, avatarColor: row.avatar_color },
    }));

    // Use first pinned message as legacy pinnedMessage if not already set
    if (!pinnedMessage && pinnedMessages.length > 0) {
      pinnedMessage = pinnedMessages[0];
    }
  } catch {}

  const memberRows = await db
    .select({ member: chatMembersTable, user: usersTable })
    .from(chatMembersTable)
    .innerJoin(usersTable, eq(chatMembersTable.userId, usersTable.id))
    .where(eq(chatMembersTable.chatId, chatId));

  const myMember = memberRows.find(m => m.member.userId === currentUserId);

  const [lastMessageRow] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  let lastMessage = null;
  if (lastMessageRow) {
    const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, lastMessageRow.senderId) });
    const reactions = await db.select().from(reactionsTable).where(eq(reactionsTable.messageId, lastMessageRow.id));
    // Compute isRead / isDelivered for the lastMessage (from perspective of currentUserId)
    const otherMembers2 = await db.select({
      lastReadAt: chatMembersTable.lastReadAt,
      lastDeliveredAt: chatMembersTable.lastDeliveredAt,
    }).from(chatMembersTable)
      .where(and(eq(chatMembersTable.chatId, chatId), ne(chatMembersTable.userId, currentUserId)));
    const msgTime = new Date(lastMessageRow.createdAt).getTime();
    const maxRead2 = otherMembers2.reduce((mx, m) => Math.max(mx, m.lastReadAt ? new Date(m.lastReadAt).getTime() : 0), 0);
    const maxDel2  = otherMembers2.reduce((mx, m) => Math.max(mx, m.lastDeliveredAt ? new Date(m.lastDeliveredAt).getTime() : 0), 0);
    const lmIsRead      = lastMessageRow.senderId === currentUserId ? maxRead2 >= msgTime : true;
    const lmIsDelivered = lastMessageRow.senderId === currentUserId ? maxDel2  >= msgTime : true;
    lastMessage = { ...lastMessageRow, sender, reactions, isRead: lmIsRead, isDelivered: lmIsDelivered };
  }

  let unreadCount = 0;
  const lastReadAt = myMember?.member.lastReadAt;
  if (lastReadAt) {
    const [r] = await db.select({ count: count() })
      .from(messagesTable)
      .where(and(
        eq(messagesTable.chatId, chatId),
        gt(messagesTable.createdAt, lastReadAt),
        ne(messagesTable.senderId, currentUserId)
      ));
    unreadCount = Number(r?.count ?? 0);
  } else {
    const [r] = await db.select({ count: count() })
      .from(messagesTable)
      .where(and(
        eq(messagesTable.chatId, chatId),
        ne(messagesTable.senderId, currentUserId)
      ));
    unreadCount = Number(r?.count ?? 0);
  }

  let otherUser = null;
  if (chat.type === "direct") {
    const other = memberRows.find(m => m.member.userId !== currentUserId);
    if (other?.user) {
      // Attach prime info to otherUser
      try {
        const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${other.user.id}`);
        const pu = primeRow.rows[0] as any;
        const hasPrime = (pu?.has_prime === true || pu?.has_prime === "t") && pu?.prime_expires_at && new Date(pu.prime_expires_at) > new Date();
        otherUser = { ...other.user, hasPrime: !!hasPrime, primeTier: hasPrime ? pu?.prime_tier : null };
      } catch {
        otherUser = other.user;
      }
    }
  }

  return {
    ...chat,
    isPinned: myMember?.member.isPinned ?? false,
    isMuted: myMember?.member.isMuted ?? false,
    unreadCount,
    lastMessage,
    members: memberRows.map(m => ({ ...m.member, user: m.user })),
    otherUser,
    pinnedMessage,
    pinnedMessages,
  };
}

router.get("/chats", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const myMemberships = await db
      .select({ chatId: chatMembersTable.chatId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, uid));

    const chatIds = myMemberships.map(m => m.chatId);
    if (chatIds.length === 0) return res.json([]);

    const chats = await Promise.all(chatIds.map(id => buildChat(id, uid)));
    res.json(chats.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chats/saved", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`
      SELECT c.id FROM chats c
      JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ${uid}
      WHERE c.type = 'saved'
      LIMIT 1
    `);
    if ((rows.rows as any[]).length > 0) {
      const chatId = (rows.rows[0] as any).id;
      const result = await buildChat(chatId, uid);
      return res.json(result);
    }
    const [chat] = await db.insert(chatsTable).values({ type: "saved" as any, name: "Избранное", avatarColor: "#f59e0b" }).returning();
    await db.insert(chatMembersTable).values({ chatId: chat.id, userId: uid, role: "member" });
    const result = await buildChat(chat.id, uid);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chats/direct", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const myMemberships = await db
      .select({ chatId: chatMembersTable.chatId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, uid));

    const theirMemberships = await db
      .select({ chatId: chatMembersTable.chatId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, userId));

    const myIds = new Set(myMemberships.map(m => m.chatId));

    for (const { chatId } of theirMemberships) {
      if (!myIds.has(chatId)) continue;
      const found = await db.query.chatsTable.findFirst({
        where: and(eq(chatsTable.id, chatId), eq(chatsTable.type, "direct"))
      });
      if (found) {
        const result = await buildChat(found.id, uid);
        return res.json(result);
      }
    }

    const [chat] = await db.insert(chatsTable).values({ type: "direct" }).returning();
    await db.insert(chatMembersTable).values([
      { chatId: chat.id, userId: uid, role: "member" },
      { chatId: chat.id, userId, role: "member" },
    ]);
    const result = await buildChat(chat.id, uid);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chats", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = CreateChatBody.parse(req.body);
    const [chat] = await db.insert(chatsTable).values({
      type: body.type,
      name: body.name,
      description: body.description,
    }).returning();

    await db.insert(chatMembersTable).values({ chatId: chat.id, userId: uid, role: "owner" });
    if (body.memberIds) {
      for (const memberId of body.memberIds) {
        if (memberId !== uid) {
          await db.insert(chatMembersTable).values({ chatId: chat.id, userId: memberId, role: "member" });
        }
      }
    }

    const result = await buildChat(chat.id, uid);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chats/discover", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const q = ((req.query.q as string) || "").trim();
    const rows = await db.execute(sql`
      SELECT
        c.id, c.name, c.type, c.avatar_url, c.avatar_color, c.description,
        COUNT(DISTINCT cm.user_id)::int AS member_count,
        EXISTS(SELECT 1 FROM chat_members WHERE chat_id = c.id AND user_id = ${uid}) AS is_member
      FROM chats c
      LEFT JOIN chat_members cm ON cm.chat_id = c.id
      WHERE c.type IN ('group','channel')
        AND (${q} = '' OR c.name ILIKE ${'%' + q + '%'} OR COALESCE(c.description,'') ILIKE ${'%' + q + '%'})
      GROUP BY c.id
      ORDER BY member_count DESC, c.created_at DESC
      LIMIT 40
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chats/:chatId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    const chat = await buildChat(chatId, uid);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/chats/:chatId", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    const body = UpdateChatBody.parse(req.body);

    if (body.isMuted !== undefined) {
      await db.update(chatMembersTable)
        .set({ isMuted: body.isMuted })
        .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid)));
    }
    if (body.name !== undefined || body.description !== undefined || body.avatarUrl !== undefined) {
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
      await db.update(chatsTable).set(updateData).where(eq(chatsTable.id, chatId));
    }

    const chat = await buildChat(chatId, uid);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/chats/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const uid = req.currentUserId;
    const membership = await db.query.chatMembersTable.findFirst({
      where: and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid)),
    });
    if (!membership) return res.status(403).json({ error: "Forbidden" });
    if (membership.role !== "owner" && membership.role !== "admin") return res.status(403).json({ error: "Only chat owners can delete chats" });
    // Clean up pinned messages first
    await db.execute(sql`DELETE FROM pinned_messages WHERE chat_id = ${chatId}`).catch(() => {});
    await db.delete(messagesTable).where(eq(messagesTable.chatId, chatId));
    await db.delete(chatMembersTable).where(eq(chatMembersTable.chatId, chatId));
    await db.delete(chatsTable).where(eq(chatsTable.id, chatId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chats/:chatId/members", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const members = await db
      .select({ member: chatMembersTable, user: usersTable })
      .from(chatMembersTable)
      .innerJoin(usersTable, eq(chatMembersTable.userId, usersTable.id))
      .where(eq(chatMembersTable.chatId, chatId));

    // Attach prime info to each member
    const membersWithPrime = await Promise.all(members.map(async m => {
      try {
        const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${m.user.id}`);
        const pu = primeRow.rows[0] as any;
        const hasPrime = (pu?.has_prime === true || pu?.has_prime === "t") && pu?.prime_expires_at && new Date(pu.prime_expires_at) > new Date();
        return { ...m.member, user: { ...m.user, hasPrime: !!hasPrime, primeTier: hasPrime ? pu?.prime_tier : null } };
      } catch {
        return { ...m.member, user: m.user };
      }
    }));

    res.json(membersWithPrime);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chats/:chatId/members", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const body = AddChatMemberBody.parse(req.body);
    const [member] = await db.insert(chatMembersTable).values({
      chatId,
      userId: body.userId,
      role: body.role ?? "member",
    }).returning();
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, body.userId) });
    res.status(201).json({ ...member, user });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/chats/:chatId/members/:memberId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const memberId = Number(req.params.memberId);
    await db.delete(chatMembersTable).where(
      and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, memberId))
    );
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chats/:chatId/read", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    const now = new Date();
    await db.update(chatMembersTable)
      .set({ lastReadAt: now, lastDeliveredAt: now })
      .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid)));
    // Broadcast to all chat members so senders see their checkmarks flip to ✓✓
    broadcastToChat(chatId, "messages-read", { chatId, readerId: uid, readAt: now.toISOString() });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark messages as delivered (recipient received them but hasn't opened chat yet)
router.post("/chats/:chatId/deliver", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    const now = new Date();
    await db.update(chatMembersTable)
      .set({ lastDeliveredAt: now })
      .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid)));
    broadcastToChat(chatId, "messages-delivered", { chatId, deliveredBy: uid, deliveredAt: now.toISOString() });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/chats/:chatId/auto-delete", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const { timer } = req.body;
    const timerVal = timer === null || timer === 0 ? null : Number(timer);
    await db.update(chatsTable).set({ autoDeleteTimer: timerVal }).where(eq(chatsTable.id, chatId));
    const uid = req.currentUserId;
    const chat = await buildChat(chatId, uid);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Multi-pin support: pin a message (up to 10 for Prime+, 1 for others)
router.put("/chats/:chatId/pin-message", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const uid = req.currentUserId;
    const { messageId } = req.body;
    const mid = messageId ? Number(messageId) : null;

    if (mid) {
      // Check message exists and belongs to this chat
      const msg = await db.query.messagesTable.findFirst({ where: eq(messagesTable.id, mid) });
      if (!msg || msg.chatId !== chatId) return res.status(404).json({ error: "Сообщение не найдено" });

      // Check current pinned count
      const countRow = await db.execute(sql`SELECT COUNT(*) as cnt FROM pinned_messages WHERE chat_id = ${chatId}`);
      const currentPins = Number((countRow.rows[0] as any)?.cnt ?? 0);

      const { isPrimePlus, hasPrime } = await getUserPrimeInfo(uid);
      const maxPins = isPrimePlus ? 10 : hasPrime ? 3 : 1;

      // Check if already pinned
      const alreadyPinned = await db.execute(sql`SELECT id FROM pinned_messages WHERE chat_id = ${chatId} AND message_id = ${mid} LIMIT 1`);
      if ((alreadyPinned.rows as any[]).length > 0) {
        // Unpin it
        await db.execute(sql`DELETE FROM pinned_messages WHERE chat_id = ${chatId} AND message_id = ${mid}`);
        // Also clear legacy pinnedMessageId if it was this message
        await db.execute(sql`UPDATE chats SET pinned_message_id = NULL WHERE id = ${chatId} AND pinned_message_id = ${mid}`).catch(() => {});
      } else {
        if (currentPins >= maxPins) {
          // Remove oldest pin to make room
          await db.execute(sql`DELETE FROM pinned_messages WHERE id = (SELECT id FROM pinned_messages WHERE chat_id = ${chatId} ORDER BY pinned_at ASC LIMIT 1)`);
        }
        await db.execute(sql`INSERT INTO pinned_messages (chat_id, message_id, pinned_by) VALUES (${chatId}, ${mid}, ${uid})`);
        // Update legacy field too for backward compat
        await db.execute(sql`UPDATE chats SET pinned_message_id = ${mid} WHERE id = ${chatId}`).catch(() => {});
      }
    } else {
      // Unpin all
      await db.execute(sql`DELETE FROM pinned_messages WHERE chat_id = ${chatId}`);
      await db.execute(sql`UPDATE chats SET pinned_message_id = NULL WHERE id = ${chatId}`).catch(() => {});
    }

    const chat = await buildChat(chatId, uid);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Unpin a specific message
router.delete("/chats/:chatId/pinned-messages/:messageId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const messageId = Number(req.params.messageId);
    const uid = req.currentUserId;

    await db.execute(sql`DELETE FROM pinned_messages WHERE chat_id = ${chatId} AND message_id = ${messageId}`);
    await db.execute(sql`UPDATE chats SET pinned_message_id = NULL WHERE id = ${chatId} AND pinned_message_id = ${messageId}`).catch(() => {});

    const chat = await buildChat(chatId, uid);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/chats/:chatId/pin", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    const current = await db.query.chatMembersTable.findFirst({
      where: and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid))
    });
    await db.update(chatMembersTable)
      .set({ isPinned: !current?.isPinned })
      .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid)));
    const chat = await buildChat(chatId, uid);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Typing routes
router.post("/chats/:chatId/typing", async (req, res) => {
  const uid = req.currentUserId;
  const chatId = Number(req.params.chatId);
  const typingType = typeof req.body?.typingType === "string" ? req.body.typingType : "text";
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    if (user) setTyping(chatId, uid, user.displayName, typingType);
  } catch {}
  res.status(204).send();
});

router.post("/chats/:chatId/typing/stop", async (req, res) => {
  const uid = req.currentUserId;
  const chatId = Number(req.params.chatId);
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    if (user) stopTyping(chatId, uid, user.displayName);
  } catch {}
  res.status(204).send();
});

// Leave chat
router.post("/chats/:chatId/leave", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    await db.delete(chatMembersTable).where(
      and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid))
    );
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Join a public group or channel
router.post("/chats/:chatId/join", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const chatId = Number(req.params.chatId);
    const chat = await db.query.chatsTable.findFirst({ where: eq(chatsTable.id, chatId) });
    if (!chat || (chat.type !== "group" && chat.type !== "channel")) {
      return res.status(404).json({ error: "Чат не найден" });
    }
    const existing = await db.execute(
      sql`SELECT 1 FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${uid} LIMIT 1`
    );
    if (existing.rows.length > 0) return res.status(409).json({ error: "Вы уже участник" });
    await db.insert(chatMembersTable).values({ chatId, userId: uid, role: "member" } as any);
    res.json({ success: true, chatId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
