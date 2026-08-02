// Native (Capacitor/Android) notification setup — FCM + local channels.
//
// FCM (Firebase Cloud Messaging) is the only reliable way to deliver
// notifications to Android when the app process is fully killed.
// Web Push / VAPID works only while the app (or its Service Worker) is alive.
//
// This module does three things on native platforms:
//   1. Creates high-importance notification channels (Android 8+, API 26+).
//      Without IMPORTANCE_HIGH the system shows no heads-up banner.
//   2. Requests POST_NOTIFICATIONS runtime permission (Android 13+, API 33+).
//   3. Registers with FCM, receives a device token, and sends it to the
//      backend so the server can push messages even when the app is dead.

import { Capacitor } from "@capacitor/core";

let _tokenSent = false; // avoid re-sending the same token on hot reloads

export async function setupNativeNotifications(authToken?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    // ── 1. High-importance channels ──────────────────────────────────────
    // importance: 5 = IMPORTANCE_HIGH → heads-up pop-over + sound.
    // Once a channel is created its importance can ONLY be changed by the user;
    // creating the channel again with a lower importance is a no-op.
    await LocalNotifications.createChannel({
      id: "messages",
      name: "Сообщения",
      description: "Новые сообщения в чатах",
      importance: 5,
      visibility: 1, // VISIBILITY_PUBLIC — show on lock screen
      vibration: true,
      sound: undefined,
    });

    await LocalNotifications.createChannel({
      id: "calls",
      name: "Звонки",
      description: "Входящие звонки",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: undefined,
    });
  } catch {
    // LocalNotifications plugin unavailable — skip channels
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // ── 2. Request permission ─────────────────────────────────────────────
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;

    // ── 3. Register with FCM and forward token to backend ─────────────────
    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      if (_tokenSent) return;
      _tokenSent = true;

      // The auth token may arrive slightly after setupNativeNotifications is called.
      // Retry a few times in case the user just logged in.
      const getToken = () =>
        authToken ??
        sessionStorage.getItem("pulse-token") ??
        undefined;

      for (let attempt = 0; attempt < 5; attempt++) {
        const bearer = getToken();
        if (!bearer) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        try {
          const res = await fetch("/api/push/fcm-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bearer}`,
            },
            body: JSON.stringify({ token: token.value }),
          });
          if (res.ok) break;
        } catch {
          // network error — retry
        }
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[fcm] registration error", err);
    });

    // ── 4. Handle notification tap (app in background / killed) ───────────
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data as Record<string, string> | undefined;
      const url = data?.url;
      if (url) {
        // Give React a tick to mount before navigating
        setTimeout(() => { window.location.href = url; }, 200);
      }
    });

  } catch (err) {
    console.warn("[fcm] PushNotifications plugin error", err);
  }
}

/** Call this when the user logs out to clear the stored FCM token. */
export async function unregisterNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  _tokenSent = false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.unregister();
  } catch {}
}
