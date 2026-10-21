// Dubai Life service worker with Web Push Notification support.
// - Pages: always from the network (so new releases show at once), with an offline page fallback.
// - Build files, icons and 3D models: kept after the first visit, refreshed in the background.
// - Live data (Supabase, Mixcloud, YouTube, APIs) is never cached.
// - Push: handles background push notifications for friend requests, messages, money, knocks.
const VERSION = "v2";
const STATIC = `dl-static-${VERSION}`;
const OFFLINE = "/offline.html";

const isDev = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/brand/icon-192.png", "/brand/logo.svg"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("dl-") && k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const cacheable = (url) =>
  !isDev &&
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/models/") || url.pathname.startsWith("/brand/") || /\.(woff2?|png|jpg|webp|svg|glb)$/.test(url.pathname));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (!cacheable(url)) return;
  event.respondWith(
    caches.open(STATIC).then(async (cache) => {
      const hit = await cache.match(req);
      const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    }),
  );
});

// --- Web Push Notifications ---

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Dubai Life", body: event.data.text() };
  }

  const title = payload.title || "Dubai Life";
  const options = {
    body: payload.body || "You have a new alert in Dubai Life.",
    icon: payload.icon || "/brand/icon-192.png",
    badge: payload.badge || "/brand/icon-192.png",
    tag: payload.tag || `dl-${Date.now()}`,
    data: {
      url: payload.url || "/phone",
      timestamp: Date.now(),
      ...payload.data,
    },
    vibrate: [120, 80, 120],
    renotify: true,
    requireInteraction: payload.requireInteraction ?? false,
    actions: payload.actions || [
      { action: "open", title: "Open" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/phone";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
