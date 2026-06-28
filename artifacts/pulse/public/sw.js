const CACHE_NAME = "aura-__BUILD_VERSION__";
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

// Tell all clients a new SW is waiting — they can prompt the user to update
self.addEventListener("message", (e) => {
  if (e.data?.type === "skip-waiting") {
    self.skipWaiting();
    return;
  }

  if (e.data?.type === "show-notification") {
    const { title, body, icon, image, url, tag, senderAvatar, senderColor, chatType } = e.data;

    const notifIcon = senderAvatar || icon || "/icon-192.png";
    const badge = "/icon-192.png";

    self.registration.showNotification(title, {
      body,
      icon: notifIcon,
      badge,
      image: image || undefined,
      data: { url: url || "/" },
      vibrate: [100, 50, 100],
      tag: tag || "aura-message",
      renotify: true,
      silent: false,
      actions: [
        { action: "reply", title: "Ответить" },
        { action: "open", title: "Открыть" },
      ],
    });
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "notification-click", url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Beautiful Push Notifications ─────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();

  const title = data.title || "Pulse";
  const body = data.body || "";
  const icon = data.senderAvatar || data.icon || "/icon-192.png";
  const badge = "/icon-192.png";
  const tag = data.tag || "pulse-message";
  const url = data.url || "/";
  const isCall = data.chatType === "call";

  const options = isCall
    ? {
        body,
        icon,
        badge,
        data: { url, isCall: true },
        vibrate: [300, 100, 300, 100, 300, 100, 300],
        tag,
        renotify: true,
        requireInteraction: true,
        silent: false,
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
        data: { url },
        vibrate: [200, 100, 200],
        tag,
        renotify: true,
        requireInteraction: false,
        actions: [
          { action: "reply", title: "Ответить" },
          { action: "open", title: "Открыть" },
        ],
      };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});
