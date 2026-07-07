import type { Response } from "express";

const chatSubscribers = new Map<number, Set<Response>>();
const typingUsers = new Map<number, Map<number, ReturnType<typeof setTimeout>>>();
const userSubscribers = new Map<number, Set<Response>>();

// Buffer for users who are temporarily disconnected (SSE reconnecting).
// We only buffer call-related signals since they are time-sensitive and must not be lost.
interface BufferedEvent {
  event: string;
  data: unknown;
  ts: number;
}
const userEventBuffer = new Map<number, BufferedEvent[]>();
const BUFFER_TTL_MS = 60_000; // keep signals for 60 seconds
const BUFFERED_EVENTS = new Set(["incoming-call", "webrtc-signal", "call-accepted", "call-declined", "call-ended", "call-missed"]);

function pushToBuffer(userId: number, event: string, data: unknown) {
  if (!BUFFERED_EVENTS.has(event)) return;
  if (!userEventBuffer.has(userId)) userEventBuffer.set(userId, []);
  const buf = userEventBuffer.get(userId)!;
  const now = Date.now();
  // Prune stale entries
  const fresh = buf.filter(e => now - e.ts < BUFFER_TTL_MS);
  fresh.push({ event, data, ts: now });
  // Keep max 30 entries per user
  if (fresh.length > 30) fresh.splice(0, fresh.length - 30);
  userEventBuffer.set(userId, fresh);
}

function flushBuffer(userId: number, res: Response) {
  const buf = userEventBuffer.get(userId);
  if (!buf || buf.length === 0) return;
  userEventBuffer.delete(userId);
  const now = Date.now();
  for (const entry of buf) {
    if (now - entry.ts < BUFFER_TTL_MS) {
      try {
        res.write(`event: ${entry.event}\ndata: ${JSON.stringify(entry.data)}\n\n`);
      } catch {}
    }
  }
}

export function subscribeToChatEvents(chatId: number, res: Response) {
  if (!chatSubscribers.has(chatId)) chatSubscribers.set(chatId, new Set());
  chatSubscribers.get(chatId)!.add(res);
}

export function unsubscribeFromChatEvents(chatId: number, res: Response) {
  chatSubscribers.get(chatId)?.delete(res);
}

export function broadcastToChat(chatId: number, event: string, data: unknown) {
  const subs = chatSubscribers.get(chatId);
  if (!subs || subs.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of subs) {
    try {
      res.write(payload);
    } catch {
      subs.delete(res);
    }
  }
}

export function subscribeToUserEvents(userId: number, res: Response) {
  if (!userSubscribers.has(userId)) userSubscribers.set(userId, new Set());
  userSubscribers.get(userId)!.add(res);
  // Replay buffered events immediately after connecting
  flushBuffer(userId, res);
}

export function unsubscribeFromUserEvents(userId: number, res: Response) {
  userSubscribers.get(userId)?.delete(res);
}

export function getUserConnectionCount(userId: number): number {
  return userSubscribers.get(userId)?.size ?? 0;
}

export function broadcastToAll(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, subs] of userSubscribers) {
    for (const res of subs) {
      try { res.write(payload); } catch { subs.delete(res); }
    }
  }
}

export function broadcastToUser(userId: number, event: string, data: unknown) {
  const subs = userSubscribers.get(userId);
  if (!subs || subs.size === 0) {
    // User is offline — buffer call-related events so they get them on reconnect
    pushToBuffer(userId, event, data);
    return;
  }
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  let delivered = false;
  for (const res of subs) {
    try {
      res.write(payload);
      delivered = true;
    } catch {
      subs.delete(res);
    }
  }
  // If all connections failed, buffer it
  if (!delivered) {
    pushToBuffer(userId, event, data);
  }
}

export function setTyping(chatId: number, userId: number, displayName: string, typingType: string = "text") {
  if (!typingUsers.has(chatId)) typingUsers.set(chatId, new Map());
  const chatTyping = typingUsers.get(chatId)!;
  const existing = chatTyping.get(userId);
  if (existing) clearTimeout(existing);

  broadcastToChat(chatId, "typing", { userId, displayName, typing: true, typingType });

  const timeout = setTimeout(() => {
    chatTyping.delete(userId);
    broadcastToChat(chatId, "typing", { userId, displayName, typing: false, typingType: "text" });
  }, 4000);
  chatTyping.set(userId, timeout);
}

export function stopTyping(chatId: number, userId: number, displayName: string) {
  const chatTyping = typingUsers.get(chatId);
  if (!chatTyping) return;
  const existing = chatTyping.get(userId);
  if (existing) clearTimeout(existing);
  chatTyping.delete(userId);
  broadcastToChat(chatId, "typing", { userId, displayName, typing: false, typingType: "text" });
}
