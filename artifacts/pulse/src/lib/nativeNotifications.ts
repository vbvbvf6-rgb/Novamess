// Native (Capacitor/Android) notification channel setup.
//
// Why this exists: on Android 8+ (API 26+), whether a notification "heads-up"
// pops over the screen is decided by the *channel's* importance level, not by
// anything a web page or service worker can set at delivery time. A PWA's
// notifications land in a single channel Chrome creates lazily on first use
// ("General" / "Miscellaneous") with DEFAULT importance — heads-up requires
// HIGH, and once a channel is created its importance can only be raised by
// the user in system settings, never by app/JS code. That's a hard platform
// limitation, not a bug in this app.
//
// A native app (this Capacitor wrapper) can instead *create* its channels
// upfront with IMPORTANCE_HIGH before any notification is ever posted, so
// they heads-up by default — the user would have to manually downgrade them,
// which essentially nobody does. This module creates those channels and asks
// for the (Android 13+) POST_NOTIFICATIONS runtime permission.
//
// Scope note: this makes heads-up behave correctly for notifications posted
// while native code / a foreground service is alive. Reliable delivery while
// the app process is fully killed still requires migrating remote delivery
// from Web Push (VAPID) to FCM via @capacitor/push-notifications, which needs
// a Firebase project — tracked separately, not part of this change.

import { Capacitor } from "@capacitor/core";

export async function setupNativeNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    await LocalNotifications.requestPermissions();

    // importance: 5 = IMPORTANCE_HIGH (heads-up + sound), matches Android's
    // NotificationManager.IMPORTANCE_HIGH constant.
    await LocalNotifications.createChannel({
      id: "messages",
      name: "Сообщения",
      description: "Новые сообщения в чатах",
      importance: 5,
      visibility: 1, // VISIBILITY_PUBLIC — show full content on lock screen
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
    // Plugin not available (e.g. web build) — no-op.
  }
}
