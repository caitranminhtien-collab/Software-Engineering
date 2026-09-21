/**
 * Service Worker cho Tuyến Di Sản Cố Đô Huế PWA
 * Hỗ trợ CacheFirst cho dữ liệu Offline Pack & core assets
 */

const CACHE_NAME = "hue-heritage-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/map.css",
  "./css/components.css",
  "./js/app.js",
  "./js/audioEngine.js",
  "./js/geofence.js",
  "./js/aiChatbot.js",
  "./js/authPayment.js",
  "./js/simulator.js",
  "./js/data/pois.js",
  "./js/data/routes.js",
  "./js/data/ragKnowledge.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Một số asset không cache được:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Trả về trang chính nếu offline hoàn toàn
        return caches.match("./index.html");
      });
    })
  );
});
