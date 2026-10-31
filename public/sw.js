// Equilibrium service worker: makes the installed app open and work offline.
// All user data lives in localStorage, so only the app shell needs caching.

const VERSION = "eq-v3";
const SHELL = ["/", "/today", "/overview", "/habits", "/analytics", "/focus", "/journal", "/settings", "/onboarding", "/manifest.webmanifest", "/icons/icon-192.png"];

// Caches each shell page plus the scripts and styles it references, so every
// section opens offline even if it was never visited online.
async function precache() {
  const cache = await caches.open(VERSION);
  const assets = new Set();
  await Promise.allSettled(
    SHELL.map(async (url) => {
      const res = await fetch(new Request(url, { cache: "reload" }));
      if (!res.ok) return;
      await cache.put(url, res.clone());
      if (!(res.headers.get("content-type") || "").includes("text/html")) return;
      const html = await res.text();
      for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+/g)) assets.add(m[0]);
    }),
  );
  await Promise.allSettled([...assets].map((u) => cache.add(u)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Build assets are content-hashed: serve from cache, fetch once.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and data: network first so updates arrive, cache when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (request.mode === "navigate" || url.pathname === "/manifest.webmanifest")) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: request.mode === "navigate" });
        if (cached) return cached;
        if (request.mode === "navigate") return (await caches.match("/today")) || Response.error();
        return Response.error();
      }),
  );
});
