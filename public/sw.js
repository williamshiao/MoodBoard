// Keeps MoodBoard working offline. Boards and images already live in IndexedDB, so
// only the app itself needs caching: the page, its hashed scripts and styles, and icons.
const CACHE = "moodboard-v1";
const SHELL = ["./", "manifest.webmanifest", "favicon.png", "icon-192.png", "icon-512.png"];

/** The page plus the scripts and styles it links to, so the first visit already works offline. */
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const page = await (await cache.match("./")).text();
  const assets = [...page.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function remember(request, response) {
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    // The page: newest when online, the cached copy when offline.
    event.respondWith(
      fetch(request)
        .then((res) => remember("./", res))
        .catch(() => caches.match("./", { ignoreVary: true })),
    );
    return;
  }
  // Scripts and styles have content hashes in their names, so a cached copy is never stale.
  event.respondWith(
    caches
      .match(request, { ignoreVary: true })
      .then((hit) => hit ?? fetch(request).then((res) => remember(request, res))),
  );
});
