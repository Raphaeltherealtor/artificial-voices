const CACHE = "artificial-voices-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/", "/icon-192.png", "/icon-512.png"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Only cache GET requests for the shell; never cache API calls
  if (e.request.method !== "GET" || e.request.url.includes("/api/")) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
