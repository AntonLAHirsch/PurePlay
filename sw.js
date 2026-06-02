const CACHE_NAME = 'pureplay-v1';
const ASSETS = [
  '/pureplay/',
  '/pureplay/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  // Notify all open tabs that an update is available
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
  });
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network-first for the Worker API (course data must be live)
  if (url.hostname.includes('workers.dev')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify({ results: [] }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Cache-first for everything else (app shell, fonts)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
