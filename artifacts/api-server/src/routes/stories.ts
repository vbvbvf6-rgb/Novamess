import { Router } from "express";
import { db, storiesTable, storyViewsTable, usersTable, contactsTable } from "@workspace/db";
import { eq, and, gt, inArray, desc, count } from "drizzle-orm";
import { CreateStoryBody } from "@workspace/api-zod";
import { getBanwords, findBanword } from "../lib/banwords";
import { offloadDataUrl } from "../lib/objectStorage";

const router = Router();

router.get("/stories", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const now = new Date();
    const contacts = await db
      .select({ contactId: contactsTable.contactId })
      .from(contactsTable)
      .where(eq(contactsTable.userId, uid));

    const contactIds = [uid, ...contacts.map(c => c.contactId)];

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
    const body = CreateStoryBody.parse(req.body);
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
