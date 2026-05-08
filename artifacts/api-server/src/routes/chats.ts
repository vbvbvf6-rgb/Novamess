import { Router } from "express";
import { db, chatsTable, chatMembersTable, usersTable, messagesTable, reactionsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { CreateChatBody, UpdateChatBody, AddChatMemberBody } from "@workspace/api-zod";

const router = Router();
const CURRENT_USER_ID = 1;

async function buildChat(chatId: number, currentUserId: number) {
  const chat = await db.query.chatsTable.findFirst({ where: eq(chatsTable.id, chatId) });
  if (!chat) return null;

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

  const unreadCount = 0;
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
  };
}

router.get("/chats", async (req, res) => {
  try {
    const myMemberships = await db
      .select({ chatId: chatMembersTable.chatId })
      .from(chatMembersTable)
      .where(eq(chatMembersTable.userId, CURRENT_USER_ID));

    const chatIds = myMemberships.map(m => m.chatId);
    if (chatIds.length === 0) return res.json([]);

    const chats = await Promise.all(chatIds.map(id => buildChat(id, CURRENT_USER_ID)));
    res.json(chats.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chats", async (req, res) => {
  try {
    const body = CreateChatBody.parse(req.body);
    const [chat] = await db.insert(chatsTable).values({
      type: body.type,
      name: body.name,
      description: body.description,
    }).returning();

    await db.insert(chatMembersTable).values({ chatId: chat.id, userId: CURRENT_USER_ID, role: "owner" });
    if (body.memberIds) {
      for (const memberId of body.memberIds) {
        if (memberId !== CURRENT_USER_ID) {
          await db.insert(chatMembersTable).values({ chatId: chat.id, userId: memberId, role: "member" });
        }
      }
    }

    const result = await buildChat(chat.id, CURRENT_USER_ID);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/chats/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const chat = await buildChat(chatId, CURRENT_USER_ID);
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/chats/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const body = UpdateChatBody.parse(req.body);

    if (body.isMuted !== undefined || body.name !== undefined) {
      if (body.isMuted !== undefined) {
        await db.update(chatMembersTable)
          .set({ isMuted: body.isMuted })
          .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, CURRENT_USER_ID)));
      }
      if (body.name !== undefined || body.description !== undefined || body.avatarUrl !== undefined) {
        const updateData: Record<string, unknown> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
        await db.update(chatsTable).set(updateData).where(eq(chatsTable.id, chatId));
      }
    }

    const chat = await buildChat(chatId, CURRENT_USER_ID);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/chats/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
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
    const chatId = Number(req.params.chatId);
    await db.update(chatMembersTable)
      .set({ lastReadAt: new Date() })
      .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, CURRENT_USER_ID)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/chats/:chatId/pin", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    const current = await db.query.chatMembersTable.findFirst({
      where: and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, CURRENT_USER_ID))
    });
    await db.update(chatMembersTable)
      .set({ isPinned: !current?.isPinned })
      .where(and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, CURRENT_USER_ID)));
    const chat = await buildChat(chatId, CURRENT_USER_ID);
    res.json(chat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
