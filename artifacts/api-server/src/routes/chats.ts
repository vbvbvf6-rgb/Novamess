import { Router } from "express";
import { db, chatsTable, chatMembersTable, usersTable, messagesTable, reactionsTable } from "@workspace/db";
import { eq, and, desc, inArray, count, gt, ne, sql } from "drizzle-orm";
import { CreateChatBody, UpdateChatBody, AddChatMemberBody } from "@workspace/api-zod";

const router = Router();

async function buildChat(chatId: number, currentUserId: number) {
  const chat = await db.query.chatsTable.findFirst({ where: eq(chatsTable.id, chatId) });
  if (!chat) return null;

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
    lastMessage = { ...lastMessageRow, sender, reactions };
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
    otherUser = other?.user ?? null;
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
    res.json(members.map(m => ({ ...m.member, user: m.user })));
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
    await db.update(chatMembersTable)
      .set({ lastReadAt: new Date() })
      .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, uid)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/chats/:chatId/auto-delete", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const { timer } = req.body; // null or seconds (number)
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

router.put("/chats/:chatId/pin-message", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const { messageId } = req.body;
    const mid = messageId ? Number(messageId) : null;
    await db.execute(
      mid
        ? sql`UPDATE chats SET pinned_message_id = ${mid} WHERE id = ${chatId}`
        : sql`UPDATE chats SET pinned_message_id = NULL WHERE id = ${chatId}`
    );
    const uid = req.currentUserId;
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

export default router;
