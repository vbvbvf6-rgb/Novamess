import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL   = process.env.VAPID_EMAIL       ?? "mailto:admin@pulse.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  senderAvatar?: string;
  senderColor?: string;
  chatType?: string;
  chatId?: number;
  image?: string;
  callId?: number;
}

export async function sendPushToUser(
  userId: number,
  payload: PushPayload
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const rows = await db.execute(
      sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`
    );
    const isCall = payload.chatType === "call";
    // High urgency for calls (FCM/APNs wake device immediately), normal for messages
    const urgency: "very-low" | "low" | "normal" | "high" = isCall ? "high" : "high";
    // TTL: calls expire in 90 seconds (useless after that), messages last 24 hours
    const ttl = isCall ? 90 : 86400;
    for (const row of rows.rows as any[]) {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      webpush.sendNotification(subscription, JSON.stringify(payload), {
        urgency,
        TTL: ttl,
      }).catch(async (err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${row.endpoint}`).catch(() => {});
        }
      });
    }
  } catch {}
}

// ── Unread notifications for Periodic Background Sync ────────────────────────
// Called by the Service Worker in periodicsync to find missed messages.
// Returns the latest unread message per chat from the past 2 hours.
router.get("/notifications/unread", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  try {
    // Get most recent message per chat (last 2 hours) where user is a member
    // but didn't send the message
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (m.chat_id)
        m.chat_id   AS "chatId",
        m.type,
        m.text,
        u.display_name AS "senderName",
        u.avatar_url   AS "senderAvatar",
        c.name         AS "chatName",
        c.type         AS "chatType"
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN chats c ON c.id = m.chat_id
      JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = ${uid}
      WHERE m.sender_id != ${uid}
        AND m.created_at > NOW() - INTERVAL '2 hours'
      ORDER BY m.chat_id, m.created_at DESC
      LIMIT 10
    `);

    const notifications = (rows.rows as any[]).map((r) => {
      const body =
        r.type === "image"    ? "📷 Фото"
        : r.type === "audio"  ? "🎤 Голосовое"
        : r.type === "video"  ? "🎥 Видео"
        : r.type === "document" ? "📎 Файл"
        : r.type === "sticker" ? "🎨 Стикер"
        : (r.text || "Новое сообщение");
      const isDirect = r.chatType === "direct";
      return {
        chatId:  r.chatId,
        title:   isDirect ? r.senderName : r.chatName,
        body:    isDirect ? body : `${r.senderName}: ${body}`,
        icon:    r.senderAvatar || null,
      };
    });

    res.json({ notifications });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ notifications: [] });
  }
});

router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ key: VAPID_PUBLIC });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Неверные данные подписки" });
    }
    await db.execute(
      sql`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
          VALUES (${uid}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
          ON CONFLICT (endpoint) DO UPDATE SET user_id = ${uid}, p256dh = ${keys.p256dh}, auth = ${keys.auth}`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/push/subscribe", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { endpoint } = req.body;
    if (endpoint) {
      await db.execute(
        sql`DELETE FROM push_subscriptions WHERE user_id = ${uid} AND endpoint = ${endpoint}`
      );
    } else {
      await db.execute(
        sql`DELETE FROM push_subscriptions WHERE user_id = ${uid}`
      );
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
