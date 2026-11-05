const CACHE_NAME = 'bridge-sync-shell-v3';
const APP_SHELL = [
  '/',
  '/app',
  '/app/templates',
  '/app/keigo',
  '/app/minutes/new',
  '/app/operations',
  '/app/reports',
  '/app/calendar',
  '/app/glossary',
  '/app/notes',
  '/app/operations',
  '/app/history',
  '/app/settings/projects',
  '/manifest.webmanifest',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests from the same origin, excluding API endpoints
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-First (Network falling back to Cache) Strategy:
  // Always query the live server first to prevent stale UI caching.
  // Fall back to caches only when the server is offline or unreachable.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful static asset responses dynamically for offline fallback
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => {
        // Offline mode: retrieve from cache, fall back to cached /app skeleton if navigating
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/app');
          }
        });
      })
  );
});
