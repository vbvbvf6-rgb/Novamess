import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { EFFECTIVE_JWT_SECRET } from "../app";

let io: SocketIOServer | null = null;

interface BufferedSignal {
  signal: unknown;
  fromUserId: number;
  targetUserId?: number;
  ts: number;
}

const signalBuffer = new Map<number, BufferedSignal[]>();
const SIGNAL_TTL = 60_000;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = jwt.verify(token, EFFECTIVE_JWT_SECRET) as { userId: number; pending2fa?: boolean };
      if (!payload.pending2fa && Number.isFinite(payload.userId) && payload.userId > 0) {
        socket.data.userId = payload.userId;
        return next();
      }
      next(new Error("Unauthorized"));
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as number;

    socket.on("join-call", ({ callId }: { callId: number }) => {
      if (!callId) return;

      // Get current members before joining so we can notify them
      const room = io?.sockets.adapter.rooms.get(`call:${callId}`);
      const existingUserIds: number[] = [];
      if (room) {
        for (const socketId of room) {
          const s = io?.sockets.sockets.get(socketId);
          if (s && s.data.userId !== userId) {
            existingUserIds.push(s.data.userId as number);
          }
        }
      }

      socket.join(`call:${callId}`);
      socket.data.callId = callId;

      // Flush buffered signals meant for this user
      const buf = signalBuffer.get(callId);
      if (buf && buf.length > 0) {
        const now = Date.now();
        const toSend = buf.filter(
          (e) =>
            now - e.ts < SIGNAL_TTL &&
            e.fromUserId !== userId &&
            (e.targetUserId === undefined || e.targetUserId === userId),
        );
        for (const entry of toSend) {
          socket.emit("webrtc-signal", { signal: entry.signal, fromUserId: entry.fromUserId });
        }
        // Remove sent entries
        signalBuffer.set(
          callId,
          buf.filter(
            (e) =>
              e.fromUserId === userId ||
              (e.targetUserId !== undefined && e.targetUserId !== userId) ||
              now - e.ts >= SIGNAL_TTL,
          ),
        );
      }

      // Notify existing members that a new peer has joined
      if (existingUserIds.length > 0) {
        socket.to(`call:${callId}`).emit("peer-joined", { userId, callId });
        // Also tell the new joiner who's already there
        socket.emit("peers-present", { userIds: existingUserIds, callId });
      }
    });

    socket.on(
      "webrtc-signal",
      ({
        callId,
        signal,
        targetUserId,
      }: {
        callId: number;
        signal: unknown;
        targetUserId?: number;
      }) => {
        if (!callId || signal === undefined) return;

        if (targetUserId) {
          // Directed signal — find the target user's socket in this room
          const room = io?.sockets.adapter.rooms.get(`call:${callId}`);
          let delivered = false;
          if (room) {
            for (const socketId of room) {
              const s = io?.sockets.sockets.get(socketId);
              if (s && s.data.userId === targetUserId) {
                s.emit("webrtc-signal", { signal, fromUserId: userId });
                delivered = true;
                break;
              }
            }
          }
          if (!delivered) {
            // Target not connected yet — buffer it
            if (!signalBuffer.has(callId)) signalBuffer.set(callId, []);
            const buf = signalBuffer.get(callId)!;
            buf.push({ signal, fromUserId: userId, targetUserId, ts: Date.now() });
            if (buf.length > 100) buf.splice(0, buf.length - 100);
          }
        } else {
          // Broadcast to all others in the room (1-on-1 fallback)
          const room = io?.sockets.adapter.rooms.get(`call:${callId}`);
          let delivered = false;
          if (room) {
            for (const socketId of room) {
              const s = io?.sockets.sockets.get(socketId);
              if (s && s.data.userId !== userId) {
                s.emit("webrtc-signal", { signal, fromUserId: userId });
                delivered = true;
              }
            }
          }
          if (!delivered) {
            if (!signalBuffer.has(callId)) signalBuffer.set(callId, []);
            const buf = signalBuffer.get(callId)!;
            buf.push({ signal, fromUserId: userId, ts: Date.now() });
            if (buf.length > 100) buf.splice(0, buf.length - 100);
          }
        }
      },
    );

    socket.on("leave-call", ({ callId }: { callId: number }) => {
      if (!callId) return;
      socket.leave(`call:${callId}`);
      if (socket.data.callId === callId) socket.data.callId = undefined;
      // Notify remaining participants
      socket.to(`call:${callId}`).emit("peer-left", { userId, callId });
    });

    socket.on("disconnect", () => {
      const callId = socket.data.callId as number | undefined;
      if (!callId) return;
      socket.to(`call:${callId}`).emit("peer-left", { userId, callId });
      setTimeout(() => {
        const room = io?.sockets.adapter.rooms.get(`call:${callId}`);
        if (!room || room.size === 0) {
          signalBuffer.delete(callId);
        }
      }, 10_000);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
