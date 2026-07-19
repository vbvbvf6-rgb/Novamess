import { useState, useCallback, useEffect } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
}

async function registerPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch("/api/push/vapid-public-key");
    if (!keyRes.ok) return;
    const { key } = await keyRes.json();
    if (!key) return;

    // Force re-subscribe if the VAPID key changed (e.g. after initial setup)
    const storedKey = localStorage.getItem("push-vapid-key");
    let subscription = await reg.pushManager.getSubscription();
    if (subscription && storedKey !== key) {
      await subscription.unsubscribe();
      subscription = null;
    }

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as ArrayBuffer,
      });
    }

    const { endpoint, keys } = subscription.toJSON() as any;
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ endpoint, keys }),
    });
    if (res.ok) {
      localStorage.setItem("push-vapid-key", key);
    }
  } catch (err) {
    console.warn("[push] registration failed", err);
  }
}

async function unregisterPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ endpoint }),
    });
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  // Re-register push when tab becomes visible (handles expired/cleared subscriptions)
  useEffect(() => {
    const onVisible = () => {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        "serviceWorker" in navigator
      ) {
        registerPushSubscription();
        // Also refresh the auth token in SW
        const token = sessionStorage.getItem("pulse-token");
        const userId = sessionStorage.getItem("pulse-user-id");
        if (token && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "set-auth", token, userId });
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    // Also run once on mount
    onVisible();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") return "denied";
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      // Request persistent storage so the browser keeps our SW alive
      // and doesn't throttle notifications when memory is low
      if ("storage" in navigator && "persist" in navigator.storage) {
        navigator.storage.persist().catch(() => {});
      }
      await registerPushSubscription();
      // Register Periodic Background Sync so SW can check for missed messages
      // even when the browser is closed (Android Chrome only)
      try {
        const reg = await navigator.serviceWorker.ready;
        if ("periodicSync" in reg) {
          const status = await (navigator.permissions as any).query({ name: "periodic-background-sync" });
          if (status.state === "granted") {
            await (reg as any).periodicSync.register("check-messages", {
              minInterval: 5 * 60 * 1000, // every 5 minutes at most
            });
          }
        }
      } catch {}
    }
    return result;
  }, []);

  const notify = useCallback(
    (
      title: string,
      options: {
        body?: string;
        icon?: string;
        senderAvatar?: string;
        senderColor?: string;
        chatType?: string;
        image?: string;
        url?: string;
        tag?: string;
        type?: "message" | "call";
      } = {}
    ) => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible" && document.hasFocus()) return;

      const type = options.type ?? "message";
      if (type === "message" && localStorage.getItem("pulse-notify-messages") === "false") return;
      if (type === "call" && localStorage.getItem("pulse-notify-calls") === "false") return;


      const showPreview = localStorage.getItem("pulse-notify-preview") !== "false";
      const body = showPreview ? (options.body || "") : "";

      // Pick the best icon: senderAvatar > icon > fallback
      const notifIcon = options.senderAvatar || options.icon || "/icon-192.png";

      const isSilent = localStorage.getItem("pulse-notify-sounds") === "false";
      const notifOpts: NotificationOptions = {
        body,
        icon: notifIcon,
        badge: "/badge-96.png",
        tag: options.tag || "nova-message",
        silent: isSilent,
        requireInteraction: type === "call",  // call stays on screen until tapped
        vibrate: type === "call" ? [400, 100, 400, 100, 400, 200, 400] : [200, 80, 200],
        timestamp: Date.now(),
        data: { url: options.url || "/", isCall: type === "call" },
      };

      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "show-notification",
          title,
          ...notifOpts,
          icon: notifIcon,
          senderAvatar: options.senderAvatar,
          senderColor: options.senderColor,
          chatType: options.chatType,
          image: options.image,
          url: options.url || "/",
        });
      } else {
        try {
          new Notification(title, notifOpts);
        } catch {}
      }
    },
    []
  );

  const isSupported = typeof Notification !== "undefined";

  return { permission, requestPermission, notify, isSupported, registerPushSubscription, unregisterPushSubscription };
}
