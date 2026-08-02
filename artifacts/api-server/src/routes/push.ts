import { Router } from "express";
import webpush from "web-push";
import jwt from "jsonwebtoken";
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

// ── FCM v1 via service account (no firebase-admin needed) ───────────────────
// FIREBASE_SERVICE_ACCOUNT env var must be the full JSON of a Firebase service
// account key (downloaded from Firebase Console → Project Settings → Service Accounts).
//
// We reuse jsonwebtoken (already in the project) to sign the OAuth2 JWT,
// then exchange it for a short-lived access token to call the FCM HTTP v1 API.

let _fcmAccessToken: string | null = null;
let _fcmTokenExpiry  = 0;

async function getFcmAccessToken(): Promise<string | null> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  if (_fcmAccessToken && Date.now() < _fcmTokenExpiry) return _fcmAccessToken;

  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const now = Math.floor(Date.now() / 1000);

    // Sign a JWT for Google OAuth2
    const assertion = (jwt as any).sign(
      {
        iss: sa.client_email,
        sub: sa.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
      },
      sa.private_key,
      { algorithm: "RS256" }
    );

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth2:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as { access_token: string; expires_in: number };
    _fcmAccessToken = data.access_token;
    _fcmTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 1-min safety margin
    return _fcmAccessToken;
  } catch {
    return null;
  }
}

async function sendFcmToToken(fcmToken: string, payload: PushPayload): Promise<boolean> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return false;

  const sa = (() => {
    try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!); } catch { return null; }
  })();
  if (!sa?.project_id) return false;

  const accessToken = await getFcmAccessToken();
  if (!accessToken) return false;

  const isCall = !!payload.callId;

  const body = {
    message: {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url:    payload.url    ?? "/",
        chatId: String(payload.chatId  ?? ""),
        callId: String(payload.callId  ?? ""),
        tag:    payload.tag    ?? "nova-message",
        type:   isCall ? "call" : "message",
      },
      android: {
        priority: "high",
        notification: {
          channel_id: isCall ? "calls" : "messages",
          icon: "ic_stat_pulse",
          color: "#ff5500",
          default_vibrate_timings: true,
          notification_priority: "PRIORITY_HIGH",
          visibility: "PUBLIC",
          ...(isCall ? { sticky: true } : {}),
        },
        // TTL: calls expire in 90s (useless after that), messages last 24h
        ttl: isCall ? "90s" : "86400s",
      },
    },
  };

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (res.status === 404 || res.status === 410) return false; // stale token
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main: send push to a user (Web Push + FCM) ─────────────────────────────
export async function sendPushToUser(userId: number, payload: PushPayload) {
  // 1. Web Push (VAPID) — works on web PWA, Chrome/Firefox push
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    try {
      const rows = await db.execute(
        sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`
      );
      const isCall = payload.chatType === "call";
      const ttl = isCall ? 90 : 86400;
      for (const row of rows.rows as any[]) {
        const subscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        webpush.sendNotification(subscription, JSON.stringify(payload), {
          urgency: "high",
          TTL: ttl,
        }).catch(async (err: any) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.execute(
              sql`DELETE FROM push_subscriptions WHERE endpoint = ${row.endpoint}`
            ).catch(() => {});
          }
        });
      }
    } catch {}
  }

  // 2. FCM — works on native Android (app killed / doze mode)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const rows = await db.execute(
        sql`SELECT token FROM fcm_tokens WHERE user_id = ${userId}`
      );
      for (const row of rows.rows as any[]) {
        const ok = await sendFcmToToken(row.token, payload);
        if (!ok) {
          // Stale/invalid token — remove it
          db.execute(
            sql`DELETE FROM fcm_tokens WHERE token = ${row.token}`
          ).catch(() => {});
        }
      }
    } catch {}
  }
}

// ── Unread notifications for Periodic Background Sync ────────────────────────
router.get("/notifications/unread", async (req, res) => {
  const uid = req.currentUserId;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  try {
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

// ── Web Push subscription ──────────────────────────────────────────────────
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

// ── FCM token registration ─────────────────────────────────────────────────
// Called by the native Android app (Capacitor) when it receives an FCM token.
router.post("/push/fcm-token", async (req, res) => {
  try {
    const uid = req.currentUserId;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== "string" || token.length < 10) {
      return res.status(400).json({ error: "Invalid FCM token" });
    }
    // Upsert: one device may refresh its FCM token; also move token to this user if
    // it was registered under a different user (device shared between accounts).
    await db.execute(
      sql`INSERT INTO fcm_tokens (user_id, token, updated_at)
          VALUES (${uid}, ${token}, NOW())
          ON CONFLICT (token) DO UPDATE SET user_id = ${uid}, updated_at = NOW()`
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ── FCM token deregistration (logout) ─────────────────────────────────────
router.delete("/push/fcm-token", async (req, res) => {
  try {
    const uid = req.currentUserId;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    const { token } = req.body as { token?: string };
    if (token) {
      await db.execute(sql`DELETE FROM fcm_tokens WHERE user_id = ${uid} AND token = ${token}`);
    } else {
      await db.execute(sql`DELETE FROM fcm_tokens WHERE user_id = ${uid}`);
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
