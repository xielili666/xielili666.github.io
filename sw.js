/* 清理缓存用 SW - 不缓存任何内容，只清理旧缓存 */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  e.waitUntil(Promise.all([
    caches.keys().then(function(ks) { return Promise.all(ks.map(function(k) { return caches.delete(k); })); }),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', function(e) { e.respondWith(fetch(e.request)); });