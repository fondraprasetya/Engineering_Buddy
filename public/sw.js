/* Engineering Buddy minimal service worker: offline fallback page */
const CACHE = 'engbuddy-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/landing/logo.png'])).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', (e) => {
  let data = { title: 'Engineering Buddy', body: 'You have a new notification.', url: '/notifications' };
  try {
    if (e.data) data = Object.assign(data, e.data.json());
  } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/notifications' },
    })
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/notifications';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
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
