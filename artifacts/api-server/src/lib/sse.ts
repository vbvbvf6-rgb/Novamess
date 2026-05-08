import type { Response } from "express";

const chatSubscribers = new Map<number, Set<Response>>();
const typingUsers = new Map<number, Map<number, ReturnType<typeof setTimeout>>>();

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

export function setTyping(chatId: number, userId: number, displayName: string) {
  if (!typingUsers.has(chatId)) typingUsers.set(chatId, new Map());
  const chatTyping = typingUsers.get(chatId)!;
  const existing = chatTyping.get(userId);
  if (existing) clearTimeout(existing);

  broadcastToChat(chatId, "typing", { userId, displayName, typing: true });

  const timeout = setTimeout(() => {
    chatTyping.delete(userId);
    broadcastToChat(chatId, "typing", { userId, displayName, typing: false });
  }, 4000);
  chatTyping.set(userId, timeout);
}

export function stopTyping(chatId: number, userId: number, displayName: string) {
  const chatTyping = typingUsers.get(chatId);
  if (!chatTyping) return;
  const existing = chatTyping.get(userId);
  if (existing) clearTimeout(existing);
  chatTyping.delete(userId);
  broadcastToChat(chatId, "typing", { userId, displayName, typing: false });
}
