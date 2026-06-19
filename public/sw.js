self.addEventListener('push', function(e) {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'OshiPulse';
  const options = {
    body: data.body || '推しの新着投稿があります',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: data.url || '/' }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
