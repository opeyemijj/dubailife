// Dubai Life service worker.
// - Pages: always from the network (so new releases show at once), with an offline page fallback.
// - Build files, icons and 3D models: kept after the first visit, refreshed in the background.
// - Live data (Supabase, Mixcloud, YouTube, APIs) is never cached.
const VERSION = "v1";
const STATIC = `dl-static-${VERSION}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/brand/icon-192.png", "/brand/logo.svg"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("dl-") && k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const cacheable = (url) =>
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
