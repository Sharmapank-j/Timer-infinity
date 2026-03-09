/**
 * Timer Infinity – Service Worker
 *
 * Caches core assets so the timer works offline.
 * Uses a cache-first strategy for app shell files.
 */

const CACHE_NAME = "timer-infinity-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./favicon.svg",
  "./manifest.json",
];

/* ── Install: pre-cache app shell ──────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate: clean up old caches ─────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: cache-first, fall back to network ──────────── */
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
