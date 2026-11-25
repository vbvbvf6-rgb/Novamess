import { Router } from "express";
import { db, audioRoomsTable, callsTable, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getIO } from "../lib/socket";

const router = Router();

router.get("/audio-rooms", async (req, res) => {
  try {
    if (req.query.chatId !== undefined) {
      const chatId = Number(req.query.chatId);
      if (!Number.isSafeInteger(chatId) || chatId <= 0) {
        return res.status(400).json({ error: "Некорректный канал" });
      }
      const membership = await db.execute(sql`
        SELECT 1 FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${req.currentUserId} LIMIT 1
      `);
      if (!membership.rows.length) return res.status(403).json({ error: "Нет доступа к этому каналу" });

      const [room] = await db.select({
        id: audioRoomsTable.id,
        callId: audioRoomsTable.callId,
        hostId: audioRoomsTable.hostId,
        name: audioRoomsTable.name,
        status: audioRoomsTable.status,
        createdAt: audioRoomsTable.createdAt,
        chatId: callsTable.chatId,
        callerId: callsTable.callerId,
      })
        .from(audioRoomsTable)
        .innerJoin(callsTable, eq(audioRoomsTable.callId, callsTable.id))
        .where(and(
          eq(audioRoomsTable.status, "active"),
          eq(callsTable.chatId, chatId),
          eq(callsTable.status, "active"),
        ))
        .orderBy(desc(audioRoomsTable.createdAt))
        .limit(1);
      return res.json(room ?? null);
    }

    const rooms = await db.select().from(audioRoomsTable)
      .where(eq(audioRoomsTable.status, "active"))
      .orderBy(desc(audioRoomsTable.createdAt));
    res.json(rooms);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/audio-rooms", async (req, res) => {
  try {
    let chatId: number | null = null;
    if (req.body?.chatId !== undefined && req.body?.chatId !== null) {
      chatId = Number(req.body.chatId);
      if (!Number.isSafeInteger(chatId) || chatId <= 0) {
        return res.status(400).json({ error: "Некорректный канал" });
      }
      const rows = await db.execute(sql`
        SELECT c.type, cm.role
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = ${req.currentUserId}
        WHERE c.id = ${chatId}
        LIMIT 1
      `);
      const membership = rows.rows[0] as { type: string; role: string } | undefined;
      if (!membership) return res.status(403).json({ error: "Нет доступа к этому каналу" });
      if (membership.type !== "channel" && membership.type !== "group") {
        return res.status(400).json({ error: "Голосовой чат доступен только в канале или группе" });
      }
      if (membership.type === "channel" && membership.role !== "owner" && membership.role !== "admin") {
        return res.status(403).json({ error: "Начать голосовой чат может только администратор канала" });
      }

      const [activeRoom] = await db.select({ id: audioRoomsTable.id })
        .from(audioRoomsTable)
        .innerJoin(callsTable, eq(audioRoomsTable.callId, callsTable.id))
        .where(and(
          eq(audioRoomsTable.status, "active"),
          eq(callsTable.chatId, chatId),
          eq(callsTable.status, "active"),
        ))
        .limit(1);
      if (activeRoom) return res.status(409).json({ error: "В этом канале уже идёт голосовой чат" });
    }

    const name = typeof req.body?.name === "string" && req.body.name.trim()
      ? req.body.name.trim().slice(0, 80) : "Аудиокомната";
    const { call, room } = await db.transaction(async tx => {
      const [call] = await tx.insert(callsTable).values({
        callerId: req.currentUserId,
        chatId,
        type: "group",
        status: "active",
        startedAt: new Date(),
      }).returning();
      const [room] = await tx.insert(audioRoomsTable).values({
        callId: call.id,
        hostId: req.currentUserId,
        name,
      }).returning();
      return { call, room };
    });
    const host = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.currentUserId) });
    res.status(201).json({
      ...call, caller: host, callee: null, roomName: room.name,
      roomId: room.id, hostId: room.hostId,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось создать аудиокомнату" });
  }
});

router.post("/audio-rooms/:roomId/join", async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    if (!Number.isSafeInteger(roomId) || roomId <= 0) return res.status(400).json({ error: "Некорректная комната" });
    const room = await db.query.audioRoomsTable.findFirst({ where: eq(audioRoomsTable.id, roomId) });
    if (!room || room.status !== "active") return res.status(404).json({ error: "Голосовой чат уже завершён" });

    const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, room.callId) });
    if (!call || call.status !== "active") return res.status(404).json({ error: "Голосовой чат уже завершён" });
    if (call.chatId !== null) {
      const membership = await db.execute(sql`
        SELECT 1 FROM chat_members WHERE chat_id = ${call.chatId} AND user_id = ${req.currentUserId} LIMIT 1
      `);
      if (!membership.rows.length) return res.status(403).json({ error: "Войти могут только участники канала" });
    }

    const host = await db.query.usersTable.findFirst({ where: eq(usersTable.id, room.hostId) });
    res.json({
      ...call,
      caller: host,
      callee: null,
      roomName: room.name,
      roomId: room.id,
      hostId: room.hostId,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Не удалось подключиться к голосовому чату" });
  }
});

router.delete("/audio-rooms/:roomId", async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    if (!Number.isSafeInteger(roomId) || roomId <= 0) return res.status(400).json({ error: "Некорректная комната" });
    const room = await db.query.audioRoomsTable.findFirst({ where: eq(audioRoomsTable.id, roomId) });
    if (!room) return res.status(404).json({ error: "Комната не найдена" });
    let canEnd = room.hostId === req.currentUserId;
    const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, room.callId) });
    if (!call) return res.status(404).json({ error: "Комната не найдена" });
    if (!canEnd && call.chatId !== null) {
      const membership = await db.execute(sql`
        SELECT role FROM chat_members WHERE chat_id = ${call.chatId} AND user_id = ${req.currentUserId} LIMIT 1
      `);
      const role = (membership.rows[0] as { role?: string } | undefined)?.role;
      canEnd = role === "owner" || role === "admin";
    }
    if (!canEnd) return res.status(403).json({ error: "Завершить голосовой чат может только администратор" });

    await db.transaction(async tx => {
      await tx.update(audioRoomsTable).set({ status: "ended" }).where(eq(audioRoomsTable.id, roomId));
      await tx.update(callsTable).set({ status: "ended", endedAt: new Date() }).where(eq(callsTable.id, room.callId));
    });
    getIO()?.to(`call:${room.callId}`).emit("call-ended", {
      callId: room.callId,
      userId: req.currentUserId,
    });
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;