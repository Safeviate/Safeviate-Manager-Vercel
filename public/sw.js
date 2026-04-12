const CACHE_VERSION = 'v1';
const STATIC_CACHE = `safeviate-static-${CACHE_VERSION}`;
const DATA_CACHE = `safeviate-data-${CACHE_VERSION}`;
const NAV_CACHE = `safeviate-nav-${CACHE_VERSION}`;
const TILE_CACHE = `safeviate-tiles-${CACHE_VERSION}`;
const TILE_CACHE_MAX_ENTRIES = 400;

const PRECACHE_URLS = ['/offline.html', '/manifest.webmanifest', '/safeviate-icon.svg'];

const isCacheableGetRequest = (request) => request.method === 'GET';
const isNavigationRequest = (request) => request.mode === 'navigate' || request.destination === 'document';
const isDataRequest = (request) => request.url.includes('/api/');
const isTileRequest = (request) => request.url.includes('tile.openstreetmap.org');

const cacheResponse = async (cacheName, request, response) => {
  if (!response) return response;
  const responseToCache = response.clone();
  const cache = await caches.open(cacheName);
  await cache.put(request, responseToCache);
  return response;
};

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;

  const entriesToDelete = keys.length - maxEntries;
  for (let index = 0; index < entriesToDelete; index += 1) {
    await cache.delete(keys[index]);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, DATA_CACHE, NAV_CACHE, TILE_CACHE].includes(key)) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheableGetRequest(request)) return;

  const url = new URL(request.url);
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(NAV_CACHE, request, response))
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  if (isDataRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(DATA_CACHE, request, response))
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ sessions: [], aircraft: [], bookings: [] }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        })
    );
    return;
  }

  if (isTileRequest(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then(async (response) => {
            const cachedResponse = await cacheResponse(TILE_CACHE, request, response);
            await trimCache(TILE_CACHE, TILE_CACHE_MAX_ENTRIES);
            return cachedResponse;
          })
          .catch(async () => {
            const fallback = await caches.match('/offline.html');
            return fallback || new Response('', { status: 204 });
          });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => cacheResponse(STATIC_CACHE, request, response));
    })
  );
});
