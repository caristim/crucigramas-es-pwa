const CACHE = 'crucigramas-es-v2'; // Cambiado a v2 para forzar actualización
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Elimina cachés antiguas automáticamente
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Si es del mismo origen, usamos una estrategia Network-First para los JSON de datos
  // y Cache-First para los archivos de la app (HTML, CSS, JS)
  if (url.origin === location.origin) {
    if (url.pathname.endsWith('.json') || url.pathname.includes('/data/')) {
      event.respondWith(
        fetch(req).catch(async () => {
          const cache = await caches.open(CACHE);
          return cache.match(req);
        })
      );
    } else {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (req.method === 'GET') cache.put(req, fresh.clone());
        return fresh;
      })());
    }
  }
});
