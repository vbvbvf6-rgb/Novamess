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
    for (const row of rows.rows as any[]) {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      webpush.sendNotification(subscription, JSON.stringify(payload)).catch(async (err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.execute(sql`DELETE FROM push_subscriptions WHERE endpoint = ${row.endpoint}`).catch(() => {});
        }
      });
    }
  } catch {}
}

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
