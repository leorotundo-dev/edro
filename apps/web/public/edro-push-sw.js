self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Edro';
  const body = payload.body || 'Nova notificação';
  const link = payload.link || '/jarvis';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { link },
      tag: payload.eventType || 'edro-notification',
      icon: '/brand/icon-orange.png',
      badge: '/brand/icon-orange.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.link || '/jarvis';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const current = clients.find((client) => 'focus' in client);
      if (current) {
        current.focus();
        current.navigate(target);
        return;
      }
      return self.clients.openWindow(target);
    }),
  );
});
