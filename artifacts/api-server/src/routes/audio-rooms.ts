import { Router } from "express";
import { db, audioRoomsTable, callsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/audio-rooms", async (_req, res) => {
  try {
    const rooms = await db.select().from(audioRoomsTable)
      .where(eq(audioRoomsTable.status, "active"))
      .orderBy(desc(audioRoomsTable.createdAt));
    res.json(rooms);
  } catch (err) {
    _req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/audio-rooms", async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" && req.body.name.trim()
      ? req.body.name.trim().slice(0, 80) : "Аудиокомната";
    const [call] = await db.insert(callsTable).values({
      callerId: req.currentUserId,
      type: "group",
      status: "active",
      startedAt: new Date(),
    }).returning();
    const [room] = await db.insert(audioRoomsTable).values({
      callId: call.id,
      hostId: req.currentUserId,
      name,
    }).returning();
    const host = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.currentUserId) });
    res.status(201).json({ ...call, caller: host, callee: null, roomName: room.name, roomId: room.id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось создать аудиокомнату" });
  }
});

router.delete("/audio-rooms/:roomId", async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const room = await db.query.audioRoomsTable.findFirst({ where: eq(audioRoomsTable.id, roomId) });
    if (!room) return res.status(404).json({ error: "Комната не найдена" });
    if (room.hostId !== req.currentUserId) return res.status(403).json({ error: "Только создатель может закрыть комнату" });
    await db.update(audioRoomsTable).set({ status: "ended" }).where(eq(audioRoomsTable.id, roomId));
    await db.update(callsTable).set({ status: "ended", endedAt: new Date() }).where(eq(callsTable.id, room.callId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;