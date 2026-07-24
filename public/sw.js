// Service Worker for Hunger App Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle real push events (e.g. from OneSignal / Firebase Web Push)
self.addEventListener('push', (event) => {
  let data = { title: 'Order Ready! 🍽️', body: 'Your food is ready for pickup.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Order Ready! 🍽️', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/logo-gNUbfLJM.png',
    badge: '/assets/logo-gNUbfLJM.png',
    vibrate: [100, 50, 100],
    data: {
      orderId: data.orderId || ''
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click and redirect user to tracking page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const targetUrl = orderId ? `/?activeTab=tracking&orderId=${orderId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and open the order
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(self.location.host) !== -1 && 'focus' in client) {
          client.postMessage({ action: 'openOrder', orderId });
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
