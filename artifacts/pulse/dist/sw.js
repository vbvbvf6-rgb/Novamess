const CACHE_NAME = "nova-mrqjqne9";
const SHELL_URLS = ["/", "/manifest.json", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(SHELL_URLS))
      // Do NOT call skipWaiting() automatically — wait for user confirmation
      // so we can show an "Update available" banner first
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/bot/") || url.pathname.startsWith("/socket.io")) return;

  // Network-first for HTML navigation requests (ensures fresh app shell)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Stale-while-revalidate for assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// ── Auth token storage (sent from app on mount / visibility change) ──────────
let _authToken = null;
let _authUserId = null;

// Tell all clients a new SW is waiting — they can prompt the user to update
self.addEventListener("message", (e) => {
  if (e.data?.type === "skip-waiting") {
    self.skipWaiting();
    return;
  }

  if (e.data?.type === "set-auth") {
    _authToken = e.data.token || null;
    _authUserId = e.data.userId || null;
    return;
  }

  if (e.data?.type === "show-notification") {
    const { title, body, icon, image, url, tag, senderAvatar, senderColor, chatType } = e.data;

    const notifIcon = senderAvatar || icon || "/icon-192.png";
    const badge = "/badge-96.png";
    const isCall = chatType === "call";

    self.registration.showNotification(title, {
      body,
      icon: notifIcon,
      badge,
      image: image || undefined,
      data: { url: url || "/", isCall, callId: e.data.callId },
      vibrate: isCall ? [300, 100, 300, 100, 300, 100, 300] : [200, 100, 200],
      tag: tag || "nova-message",
      renotify: true,
      requireInteraction: isCall,   // call stays until user acts; messages dismiss
      silent: false,
      timestamp: Date.now(),
      actions: isCall
        ? [
            { action: "accept", title: "✅ Принять" },
            { action: "decline", title: "❌ Отклонить" },
          ]
        : [
            { action: "reply", title: "Ответить" },
            { action: "open", title: "Открыть" },
          ],
    });
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const action = e.action || "";
  const isCall = !!data.isCall;
  const callId = data.callId;

  // For calls, "accept"/"decline" need to reach the running app so it can
  // join WebRTC media or PUT the call status — always focus/open a window
  // and hand it the action so AppContext can finish the job once it boots.
  let url = data.url || "/";
  if (isCall && callId != null && (action === "accept" || action === "decline")) {
    const u = new URL(url, self.location.origin);
    u.searchParams.set("callAction", action);
    u.searchParams.set("callId", String(callId));
    url = u.pathname + u.search;
  }

  const chatId = e.notification.data?.chatId ?? null;

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "notification-click", url, action, callId, isCall, chatId });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Periodic Background Sync — fallback for missed pushes ────────────────────
// Fires on Android Chrome when browser is closed (if site has periodic-sync permission).
// Checks /api/notifications/unread and shows any missed notifications.
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "check-messages") {
    e.waitUntil(checkUnreadAndNotify());
  }
});

async function checkUnreadAndNotify() {
  if (!_authToken) return;
  try {
    const res = await fetch("/api/notifications/unread", {
      headers: { Authorization: `Bearer ${_authToken}` },
    });
    if (!res.ok) return;
    const { notifications } = await res.json();
    if (!Array.isArray(notifications)) return;
    for (const n of notifications) {
      self.registration.showNotification(n.title, {
        body: n.body,
        icon: n.icon || "/icon-192.png",
        badge: "/badge-96.png",
        tag: `chat-${n.chatId}`,
        renotify: false,  // don't buzz again if notification already visible
        data: { url: `/?chat=${n.chatId}`, chatId: n.chatId, isCall: false },
        actions: [{ action: "open", title: "Открыть" }],
      });
    }
  } catch {}
}

// ── Beautiful Push Notifications ─────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();

  const title = data.title || "Pulse";
  const body = data.body || "";
  const icon = data.senderAvatar || data.icon || "/icon-192.png";
  const badge = "/badge-96.png";
  const tag = data.tag || "pulse-message";
  const url = data.url || "/";
  const isCall = data.chatType === "call";

  const options = isCall
    ? {
        body,
        icon,
        badge,
        data: { url, isCall: true, callId: data.callId, chatId: data.chatId ?? null },
        vibrate: [400, 100, 400, 100, 400, 200, 400, 100, 400],
        tag,
        renotify: true,
        requireInteraction: true,   // stays on screen until user taps
        silent: false,
        timestamp: Date.now(),
        actions: [
          { action: "accept", title: "✅ Принять" },
          { action: "decline", title: "❌ Отклонить" },
        ],
      }
    : {
        body,
        icon,
        badge,
        image: data.image || undefined,
        data: { url, isCall: false, chatId: data.chatId ?? null },
        vibrate: [200, 80, 200],
        tag,
        renotify: true,
        requireInteraction: false,
        silent: false,
        timestamp: Date.now(),
        actions: [
          { action: "reply", title: "Ответить" },
          { action: "open", title: "Открыть" },
        ],
      };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});
