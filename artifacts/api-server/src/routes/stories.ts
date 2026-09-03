import { Router } from "express";
import { db, storiesTable, storyViewsTable, usersTable, contactsTable } from "@workspace/db";
import { eq, and, gt, inArray, desc, count } from "drizzle-orm";
import { CreateStoryBody } from "@workspace/api-zod";
import { getBanwords, findBanword } from "../lib/banwords";
import { offloadDataUrl } from "../lib/objectStorage";
import { getActiveUserModeration, moderationBlocksWriting } from "../lib/userModeration";

const router = Router();

router.get("/stories", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const now = new Date();
    const outgoingContacts = await db
      .select({ contactId: contactsTable.contactId })
      .from(contactsTable)
      .where(eq(contactsTable.userId, uid));

    // Stories are private to mutual contacts: both users must have added
    // each other. The author's own stories are always visible to themselves.
    const outgoingIds = outgoingContacts.map(c => c.contactId);
    const incomingContacts = outgoingIds.length > 0
      ? await db
          .select({ userId: contactsTable.userId })
          .from(contactsTable)
          .where(and(
            eq(contactsTable.contactId, uid),
            inArray(contactsTable.userId, outgoingIds),
          ))
      : [];
    const contactIds = [uid, ...incomingContacts.map(c => c.userId)];

    const stories = await db.select().from(storiesTable)
      .where(and(
        inArray(storiesTable.userId, contactIds),
        gt(storiesTable.expiresAt, now)
      ))
      .orderBy(desc(storiesTable.createdAt));

    const viewedRows = await db.select({ storyId: storyViewsTable.storyId })
      .from(storyViewsTable)
      .where(eq(storyViewsTable.viewerId, uid));
    const viewedIds = new Set(viewedRows.map(v => v.storyId));

    const userMap = new Map<number, typeof usersTable.$inferSelect>();
    for (const userId of contactIds) {
      const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
      if (user) userMap.set(userId, user);
    }

    const grouped = new Map<number, { user: typeof usersTable.$inferSelect; stories: unknown[]; hasUnviewed: boolean }>();
    for (const story of stories) {
      const user = userMap.get(story.userId);
      if (!user) continue;
      if (!grouped.has(story.userId)) {
        grouped.set(story.userId, { user, stories: [], hasUnviewed: false });
      }
      const group = grouped.get(story.userId)!;
      const isViewed = viewedIds.has(story.id);
      if (!isViewed) group.hasUnviewed = true;
      group.stories.push({ ...story, isViewed, user });
    }

    res.json(Array.from(grouped.values()));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const moderation = await getActiveUserModeration(uid);
    if (moderationBlocksWriting(moderation.type)) {
      return res.status(403).json({
        error: moderation.type === "spam_ban" ? "Вам запрещено публиковать истории из-за спама." : "Ваш аккаунт заблокирован.",
        code: moderation.type === "spam_ban" ? "SPAM_BANNED" : "ACCOUNT_BANNED",
        banReason: moderation.reason,
        banExpiresAt: moderation.expiresAt?.toISOString() || null,
      });
    }
    const body = CreateStoryBody.parse(req.body);
    if (body.type !== "text" && body.type !== "image") {
      return res.status(400).json({ error: "В статусе можно публиковать только текст и фотографии." });
    }
    if (body.type === "image" && (!body.mediaUrl || /^data:video\//i.test(body.mediaUrl) || /\.(mp4|webm|mov|avi|mkv)(?:[?#]|$)/i.test(body.mediaUrl))) {
      return res.status(400).json({ error: "Видео нельзя публиковать в статусе. Выберите изображение." });
    }
    if (body.text) {
      const banwords = await getBanwords();
      const hit = findBanword(body.text, banwords);
      if (hit) {
        return res.status(400).json({ error: "История содержит запрещённое слово и не может быть опубликована." });
      }
    }

    const offloadedMediaUrl = await offloadDataUrl(body.mediaUrl, "stories");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db.insert(storiesTable).values({
      userId: uid,
      mediaUrl: offloadedMediaUrl,
      type: body.type,
      text: body.text,
      backgroundColor: body.backgroundColor,
      expiresAt,
    }).returning();
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, uid) });
    res.status(201).json({ ...story, isViewed: false, user });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories/:storyId/view", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const uid = req.currentUserId;
    if (!storyId) return res.status(400).json({ error: "Invalid story id" });

    const story = await db.query.storiesTable.findFirst({ where: eq(storiesTable.id, storyId) });
    if (!story) return res.status(404).json({ error: "Story not found" });
    if (story.userId === uid) return res.json({ ok: true });

    // Keep the privacy rule enforced even if a client tries to open a
    // story directly instead of receiving it through GET /stories.
    const [outgoing, incoming] = await Promise.all([
      db.select({ id: contactsTable.id })
        .from(contactsTable)
        .where(and(eq(contactsTable.userId, uid), eq(contactsTable.contactId, story.userId)))
        .limit(1),
      db.select({ id: contactsTable.id })
        .from(contactsTable)
        .where(and(eq(contactsTable.userId, story.userId), eq(contactsTable.contactId, uid)))
        .limit(1),
    ]);
    if (outgoing.length === 0 || incoming.length === 0) {
      return res.status(403).json({ error: "Story is visible only to mutual contacts" });
    }

    const existing = await db.select()
      .from(storyViewsTable)
      .where(and(eq(storyViewsTable.storyId, storyId), eq(storyViewsTable.viewerId, uid)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(storyViewsTable).values({ storyId, viewerId: uid });
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stories/:storyId/views", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const uid = req.currentUserId;
    if (!storyId) return res.status(400).json({ error: "Invalid story id" });

    const story = await db.query.storiesTable.findFirst({ where: eq(storiesTable.id, storyId) });
    if (!story) return res.status(404).json({ error: "Story not found" });
    if (story.userId !== uid) return res.status(403).json({ error: "Forbidden" });

    const [result] = await db.select({ cnt: count() }).from(storyViewsTable).where(eq(storyViewsTable.storyId, storyId));
    res.json({ count: Number(result?.cnt ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stories/:storyId", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const uid = req.currentUserId;
    const story = await db.query.storiesTable.findFirst({ where: eq(storiesTable.id, storyId) });
    if (!story) return res.status(404).json({ error: "Story not found" });
    if (story.userId !== uid) return res.status(403).json({ error: "Forbidden" });
    await db.delete(storyViewsTable).where(eq(storyViewsTable.storyId, storyId));
    await db.delete(storiesTable).where(eq(storiesTable.id, storyId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
