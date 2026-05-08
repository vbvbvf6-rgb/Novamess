import { Router } from "express";
import { subscribeToChatEvents, unsubscribeFromChatEvents, setTyping, stopTyping } from "../lib/sse";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/chats/:chatId/events", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  if (!chatId) return res.status(400).end();

  const member = await db.execute(
    sql`SELECT 1 FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${uid} LIMIT 1`
  );
  if (!member.rows.length) return res.status(403).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 25000);

  subscribeToChatEvents(chatId, res);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribeFromChatEvents(chatId, res);
  });
});

router.post("/chats/:chatId/typing", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  if (!chatId) return res.status(400).end();

  try {
    const userRow = await db.execute(sql`SELECT display_name FROM users WHERE id = ${uid} LIMIT 1`);
    const displayName = (userRow.rows[0] as any)?.display_name || "User";
    setTyping(chatId, uid, displayName);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

router.post("/chats/:chatId/typing/stop", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  if (!chatId) return res.status(400).end();

  try {
    const userRow = await db.execute(sql`SELECT display_name FROM users WHERE id = ${uid} LIMIT 1`);
    const displayName = (userRow.rows[0] as any)?.display_name || "User";
    stopTyping(chatId, uid, displayName);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

export default router;
