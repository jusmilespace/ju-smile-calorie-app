/* === Ju Smile PWA service-worker.js === */
const APP_VERSION = "2025-11-12"; // ← 每次更新程式或 CSV 就改這行
const CACHE_NAME  = `ju-cache-v${APP_VERSION}`;

const SCOPE = self.registration.scope; // 支援 GitHub Pages 子路徑

const PRECACHE_URLS = [
  `${SCOPE}index.html`,
  `${SCOPE}manifest.json`,
  // 主要資源（依你的打包輸出調整；先放占位）
  `${SCOPE}styles.css`,
  `${SCOPE}assets/index.js`,

  // 你的四個 CSV（已改成你的檔名）
  `${SCOPE}Food_DB.csv?v=${APP_VERSION}`,
  `${SCOPE}Unit_Map.csv?v=${APP_VERSION}`,
  `${SCOPE}Type_Table.csv?v=${APP_VERSION}`,
  `${SCOPE}Exercise_Met.csv?v=${APP_VERSION}`,

  // 顯示用版本檔
  `${SCOPE}version.json?v=${APP_VERSION}`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) && caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const res = await fetch(event.request);
      if (event.request.method === "GET" && res && res.status === 200) {
        cache.put(event.request, res.clone());
      }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});

self.addEventListener("message", async (event) => {
  if (event.data === "CHECK_FOR_UPDATE") {
    const clientsArr = await self.clients.matchAll({ includeUncontrolled: true });
    clientsArr.forEach(c => c.postMessage({ type: "SW_READY", version: APP_VERSION }));
  }
});
