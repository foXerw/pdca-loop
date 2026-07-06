// pdca-loop service worker：处理 Web Push 通知。
self.addEventListener('push', (event) => {
  let data = { title: 'pdca-loop', body: '', href: '/' };
  try {
    if (event.data) {
      data = { ...data, ...JSON.parse(event.data.text()) };
    }
  } catch {
    // 非 JSON payload 时用默认 title
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { href: data.href },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes(href)) {
          c.focus();
          return;
        }
      }
      await self.clients.openWindow(href);
    })(),
  );
});
