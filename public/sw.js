const CACHE_NAME = 'city-guest-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── BACKGROUND PUSH NOTIFICATIONS ────────────────────────────────────────────
// This runs even when the app tab is closed or the phone screen is locked.

self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 City Guest',
    body: 'You have a new notification.',
    isUrgent: false,
    url: '/assignments',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.isUrgent ? 'urgent-assignment' : 'assignment',
    // requireInteraction keeps the notification on screen until the user taps it
    requireInteraction: data.isUrgent,
    // vibrate: long-short-long pattern for urgent, short for normal
    vibrate: data.isUrgent ? [500, 200, 500, 200, 500] : [200, 100, 200],
    data: {
      url: data.url,
      isUrgent: data.isUrgent,
    },
    actions: data.isUrgent
      ? [{ action: 'open', title: '🚨 Open Now' }]
      : [{ action: 'open', title: 'View Assignment' }],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
// When user taps the notification, open the app and navigate to assignments.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/assignments';

  const isUrgent = event.notification.data && event.notification.data.isUrgent;

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          // Send message to app to start urgent siren if needed
          if (isUrgent) {
            client.postMessage({ type: 'START_URGENT_SIREN' });
          }
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(
        self.location.origin + targetUrl + (isUrgent ? '?urgent=1' : '')
      );
    })
  );
});
