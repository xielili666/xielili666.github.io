/* 作品集缓存 Service Worker - v1 */
var CACHE = 'portfolio-v1';
var URLS = ['/', '/index.html', '/hero-bg.mp4?v=31'];
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(URLS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(Promise.all([
    caches.keys().then(function(ks) {
      return Promise.all(ks.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) { return r || fetch(e.request); })
  );
});