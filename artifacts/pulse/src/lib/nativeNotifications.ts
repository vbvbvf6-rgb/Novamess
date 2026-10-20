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

let activeAuthToken: string | undefined;
let latestFcmToken: string | null = null;
let listenersInstalled = false;

async function saveFcmToken(token: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bearer = activeAuthToken ?? sessionStorage.getItem("pulse-token") ?? undefined;
    if (!bearer) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    try {
      const response = await fetch("/api/push/fcm-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify({ token }),
      });
      if (response.ok) return;
    } catch {
      // Retry transient network failures.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
  }
}

export async function setupNativeNotifications(authToken?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  activeAuthToken = authToken ?? sessionStorage.getItem("pulse-token") ?? undefined;

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

    // Install listeners before registering. Capacitor can deliver the
    // registration event immediately, so adding it afterwards can lose the
    // device token and leave the server unable to reach this phone.
    if (!listenersInstalled) {
      await PushNotifications.addListener("registration", ({ value }) => {
        latestFcmToken = value;
        void saveFcmToken(value);
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("[fcm] registration error", err);
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification.data as Record<string, string> | undefined;
        const url = data?.url;
        if (url) setTimeout(() => { window.location.href = url; }, 200);
      });
      listenersInstalled = true;
    }

    // ── 2. Request permission and register with FCM ────────────────────────
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;
    await PushNotifications.register();

    // Re-associate an already-issued device token after account switches.
    if (latestFcmToken) await saveFcmToken(latestFcmToken);

  } catch (err) {
    console.warn("[fcm] PushNotifications plugin error", err);
  }
}

/** Call this when the user logs out to clear the stored FCM token. */
export async function unregisterNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const bearer = activeAuthToken ?? sessionStorage.getItem("pulse-token") ?? undefined;
    if (bearer) {
      await fetch("/api/push/fcm-token", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(latestFcmToken ? { token: latestFcmToken } : {}),
      }).catch(() => {});
    }
    await PushNotifications.unregister();
    latestFcmToken = null;
    activeAuthToken = undefined;
  } catch {}
}
