/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/ubms-logo.png',
    badge: '/favicon.ico',
    data: {
      type: data.type,
      url: data.type === 'Admin' ? '/admin-dashboard' : '/tracking'
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'close', title: 'Close' }
    ],
    vibrate: [100, 50, 100]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url;
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
