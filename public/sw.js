/* Engineering Buddy minimal service worker: offline fallback page */
const CACHE = 'engbuddy-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/landing/logo.png'])).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(
        (hit) =>
          hit ||
          new Response('<h1>Engineering Buddy</h1><p>You are offline. Reconnect to continue.</p>', {
            headers: { 'Content-Type': 'text/html' },
          })
      )
    )
  );
});
