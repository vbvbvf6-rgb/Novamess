import { Router } from "express";
import { db, chatDraftsTable, chatMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router = Router();

async function canAccessChat(chatId: number, userId: number) {
  const member = await db.query.chatMembersTable.findFirst({
    where: and(eq(chatMembersTable.chatId, chatId), eq(chatMembersTable.userId, userId)),
  });
  return !!member;
}

router.get("/drafts", async (req, res) => {
  try {
    const drafts = await db.select({
      chatId: chatDraftsTable.chatId,
      text: chatDraftsTable.text,
      updatedAt: chatDraftsTable.updatedAt,
    }).from(chatDraftsTable).where(eq(chatDraftsTable.userId, req.currentUserId));
    res.json(drafts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drafts/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    if (!Number.isInteger(chatId) || !(await canAccessChat(chatId, req.currentUserId))) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }
    const draft = await db.query.chatDraftsTable.findFirst({
      where: and(eq(chatDraftsTable.chatId, chatId), eq(chatDraftsTable.userId, req.currentUserId)),
    });
    res.json({ text: draft?.text ?? "", updatedAt: draft?.updatedAt ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/drafts/:chatId", async (req, res) => {
  try {
    const chatId = Number(req.params.chatId);
    if (!Number.isInteger(chatId) || !(await canAccessChat(chatId, req.currentUserId))) {
      return res.status(403).json({ error: "Нет доступа к этому чату" });
    }
    const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 4000) : "";
    if (!text.trim()) {
      await db.delete(chatDraftsTable).where(and(eq(chatDraftsTable.chatId, chatId), eq(chatDraftsTable.userId, req.currentUserId)));
      return res.json({ text: "", updatedAt: null });
    }
    const [draft] = await db.insert(chatDraftsTable)
      .values({ chatId, userId: req.currentUserId, text })
      .onConflictDoUpdate({
        target: [chatDraftsTable.chatId, chatDraftsTable.userId],
        set: { text, updatedAt: new Date() },
      })
      .returning();
    res.json({ text: draft.text, updatedAt: draft.updatedAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;