// cometodubai.app service worker with Web Push Notification support.
// - Pages: always from the network (so new releases show at once), with an offline page fallback.
// - Build files, icons and 3D models: kept after the first visit, refreshed in the background.
// - Live data (Supabase, Mixcloud, YouTube, APIs) is never cached.
// - Push: handles background push notifications for friend requests, messages, money, knocks.
const VERSION = "v3";
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

// --- Web Push Notifications (iOS & Android Compatible) ---

self.addEventListener("push", (event) => {
  let payload = { title: "cometodubai.app", body: "You have a new alert in cometodubai.app." };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "cometodubai.app", body: event.data.text() };
    }
  }

  const title = payload.title || "cometodubai.app";
  // Clean notification options: iOS Safari strictly requires clean options (no invalid actions or unsupported properties)
  const options = {
    body: payload.body || "New notification",
    icon: payload.icon || "/brand/icon-192.png",
    badge: payload.badge || "/brand/icon-192.png",
    tag: payload.tag || `dl-${Date.now()}`,
    data: {
      url: payload.url || "/phone",
    },
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .catch(() => {
        // Fallback for minimal options if OS rejects any field
        return self.registration.showNotification(title, {
          body: options.body,
          icon: "/brand/icon-192.png",
        });
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/phone";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Or open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
