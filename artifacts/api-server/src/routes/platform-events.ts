import { Router } from "express";
import { db, platformEventsTable } from "@workspace/db";
import { eq, desc, and, lte, gte, or, isNull, sql } from "drizzle-orm";

const router = Router();

const ADMIN_USER_IDS = [4];

async function isAdminUser(userId: number): Promise<boolean> {
  if (ADMIN_USER_IDS.includes(userId)) return true;
  try {
    const rows = await db.execute(sql`SELECT is_admin FROM users WHERE id = ${userId}`);
    const user = rows.rows[0] as any;
    return !!user?.is_admin;
  } catch { return false; }
}

router.get("/platform-events", async (req, res) => {
  try {
    const now = new Date();
    const events = await db
      .select()
      .from(platformEventsTable)
      .where(
        and(
          eq(platformEventsTable.isActive, true),
          or(isNull(platformEventsTable.startAt), lte(platformEventsTable.startAt, now)),
          or(isNull(platformEventsTable.endAt), gte(platformEventsTable.endAt, now))
        )
      )
      .orderBy(desc(platformEventsTable.createdAt));
    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get joined event IDs for current user
router.get("/platform-events/joined", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT event_id FROM event_participants WHERE user_id = ${uid}`);
    res.json((rows.rows as any[]).map(r => r.event_id));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Join an event (deduct sparks if cost > 0)
router.post("/platform-events/:id/join", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const eventId = Number(req.params.id);

    const evtRows = await db.execute(sql`SELECT * FROM platform_events WHERE id = ${eventId} LIMIT 1`);
    const event = evtRows.rows[0] as any;
    if (!event) return res.status(404).json({ error: "Событие не найдено" });

    const cost = Number(event.cost || 0);
    if (cost > 0) {
      // Atomic deduct — prevents race conditions where concurrent joins could overdraw
      const deductResult = await db.execute(sql`
        UPDATE users SET balance = balance - ${cost}
        WHERE id = ${uid} AND balance >= ${cost}
        RETURNING balance
      `);
      if ((deductResult.rows as any[]).length === 0) {
        const userRow = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid} LIMIT 1`);
        const balance = Number((userRow.rows[0] as any)?.balance || 0);
        return res.status(402).json({ error: "Недостаточно искр", balance, cost });
      }
    }

    await db.execute(sql`
      INSERT INTO event_participants (event_id, user_id) VALUES (${eventId}, ${uid})
      ON CONFLICT (event_id, user_id) DO NOTHING
    `);
    await db.execute(sql`
      UPDATE platform_events SET participant_count = COALESCE(participant_count,0) + 1 WHERE id = ${eventId}
    `);

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Leave an event
router.post("/platform-events/:id/leave", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const eventId = Number(req.params.id);
    const r = await db.execute(sql`DELETE FROM event_participants WHERE event_id = ${eventId} AND user_id = ${uid}`);
    if ((r.rowCount || 0) > 0) {
      await db.execute(sql`
        UPDATE platform_events SET participant_count = GREATEST(0, COALESCE(participant_count,0) - 1) WHERE id = ${eventId}
      `);
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/platform-events", async (req, res) => {
  try {
    if (!(await isAdminUser(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const events = await db.select().from(platformEventsTable).orderBy(desc(platformEventsTable.createdAt));
    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/platform-events", async (req, res) => {
  try {
    if (!(await isAdminUser(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const { title, description, imageUrl, bannerColor, startAt, endAt, isActive, eventType, cost, conditions } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Заголовок обязателен" });

    const [event] = await db.insert(platformEventsTable).values({
      title: title.trim(),
      description: description?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      bannerColor: bannerColor || "#7c3aed",
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.currentUserId,
      eventType: eventType || "event",
      cost: cost ? Number(cost) : 0,
      conditions: conditions ? (typeof conditions === "string" ? conditions : JSON.stringify(conditions)) : null,
    } as any).returning();
    res.status(201).json(event);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/platform-events/:id", async (req, res) => {
  try {
    if (!(await isAdminUser(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const id = Number(req.params.id);
    const { title, description, imageUrl, bannerColor, startAt, endAt, isActive, eventType, cost, conditions } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (bannerColor !== undefined) updates.bannerColor = bannerColor;
    if (startAt !== undefined) updates.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) updates.endAt = endAt ? new Date(endAt) : null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (eventType !== undefined) updates.eventType = eventType;
    if (cost !== undefined) updates.cost = Number(cost);
    if (conditions !== undefined) updates.conditions = conditions
      ? (typeof conditions === "string" ? conditions : JSON.stringify(conditions)) : null;

    const [event] = await db.update(platformEventsTable).set(updates).where(eq(platformEventsTable.id, id)).returning();
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/platform-events/:id", async (req, res) => {
  try {
    if (!(await isAdminUser(req.currentUserId))) return res.status(403).json({ error: "Доступ запрещён" });
    const id = Number(req.params.id);
    await db.delete(platformEventsTable).where(eq(platformEventsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
