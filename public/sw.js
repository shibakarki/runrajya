const CACHE_NAME = 'runrajya-tactical-v4';

// 1. Force immediate activation of new code
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Clean Sweep: Deletes every single old cache found in the browser
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Network-First logic (Fetch fresh site, fallback to cache only if offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network works, update the cache for later offline use
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => {
        // If network fails (Offline), return the cached version
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // If the specific file isn't cached, return the root (index.html)
          if (event.request.mode === 'navigate') return caches.match('/');
        });
      })
  );
});