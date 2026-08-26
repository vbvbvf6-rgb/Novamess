import { Router } from "express";
import { db, platformEventsTable } from "@workspace/db";
import { eq, desc, and, lte, gte, or, isNull, sql } from "drizzle-orm";

const router = Router();

const ADMIN_USER_IDS = [4];

async function settleExpiredGiveaways() {
  const expired = await db.execute(sql`
    SELECT id, title, prize_amount, prize_description
    FROM platform_events
    WHERE event_type = 'giveaway'
      AND end_at IS NOT NULL AND end_at <= NOW()
      AND prize_awarded_at IS NULL
  `);

  for (const rawEvent of expired.rows as any[]) {
    const eventId = Number(rawEvent.id);
    try {
      const settled = await db.transaction(async (tx) => {
        const eventRows = await tx.execute(sql`
          SELECT id, title, prize_amount, prize_description
          FROM platform_events
          WHERE id = ${eventId} AND event_type = 'giveaway'
            AND end_at IS NOT NULL AND end_at <= NOW()
            AND prize_awarded_at IS NULL
          FOR UPDATE
        `);
        const event = eventRows.rows[0] as any;
        if (!event) return null;

        const participants = await tx.execute(sql`
          SELECT ep.user_id, u.username, u.display_name
          FROM event_participants ep
          JOIN users u ON u.id = ep.user_id
          WHERE ep.event_id = ${eventId}
          ORDER BY RANDOM()
          LIMIT 1
        `);
        const winner = participants.rows[0] as any;
        await tx.execute(sql`
          UPDATE platform_events
          SET winner_id = ${winner ? Number(winner.user_id) : null},
              prize_awarded_at = NOW(),
              updated_at = NOW()
          WHERE id = ${eventId} AND prize_awarded_at IS NULL
        `);

        const amount = Math.max(0, Number(event.prize_amount || 0));
        if (winner && amount > 0) {
          await tx.execute(sql`
            UPDATE users SET balance = COALESCE(balance, 0) + ${amount}
            WHERE id = ${Number(winner.user_id)}
          `);
          await tx.execute(sql`
            INSERT INTO spark_activity (user_id, amount, type, description, created_at)
            VALUES (${Number(winner.user_id)}, ${amount}, 'event_prize', ${`Приз за событие «${event.title}»`}, NOW())
          `).catch(() => {});
        }
        return winner ? {
          eventId,
          title: event.title,
          winnerId: Number(winner.user_id),
          winnerName: winner.display_name || winner.username,
          amount,
          description: event.prize_description || null,
        } : { eventId, title: event.title, winnerId: null, winnerName: null, amount, description: event.prize_description || null };
      });

      if (settled?.winnerId) {
        rescheduleWinnerNotification(settled).catch(() => {});
      }
    } catch {
      // A missing optional activity table or a transient DB error must not stop
      // settlement of the remaining giveaways.
    }
  }
}

async function rescheduleWinnerNotification(settled: { eventId: number; title: string; winnerId: number; winnerName: string; amount: number; description: string | null }) {
  // Keep the award itself transactional; notification delivery is best-effort.
  const { broadcastToUser } = await import("../lib/sse");
  broadcastToUser(settled.winnerId, "event-prize", {
    eventId: settled.eventId,
    title: settled.title,
    amount: settled.amount,
    description: settled.description,
  });
}

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
    await settleExpiredGiveaways();
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
    if (event.end_at && new Date(event.end_at) <= new Date()) {
      await settleExpiredGiveaways();
      return res.status(410).json({ error: "Событие уже завершено" });
    }

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
    await settleExpiredGiveaways();
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
    const { title, description, imageUrl, bannerColor, startAt, endAt, isActive, eventType, cost, conditions, prizeAmount, prizeDescription } = req.body;
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
      prizeAmount: eventType === "giveaway" ? Math.max(0, Number(prizeAmount || 0)) : 0,
      prizeDescription: eventType === "giveaway" ? prizeDescription?.trim() || null : null,
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
    const { title, description, imageUrl, bannerColor, startAt, endAt, isActive, eventType, cost, conditions, prizeAmount, prizeDescription } = req.body;

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
    if (prizeAmount !== undefined) updates.prizeAmount = Math.max(0, Number(prizeAmount || 0));
    if (prizeDescription !== undefined) updates.prizeDescription = prizeDescription?.trim() || null;

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
