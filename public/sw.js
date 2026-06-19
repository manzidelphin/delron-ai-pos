const CACHE = "delron-pwa-v1";
const OFFLINE_URL = "/offline.html";

// Pre-cache the offline fallback page on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Purge old caches and take control of all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation; fall back to offline page if fetch fails
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});
