// TalkType Service Worker
const CACHE_NAME = 'talktype-cache-v1';

// Assets to cache for offline use
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/offline.html',
  '/assets/talktype-icon-base.svg',
  '/assets/talktype-icon-eyes.svg',
  '/talktype-icon-bg-gradient.svg',
  '/icons/icon-192x192.png',
  // We'll keep the cache list relatively small for optimal loading
];

// Install service worker and cache core assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Ensure new service worker activates immediately
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🎭 TalkType: Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🎭 TalkType: Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Serve from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from the cached version
        if (response) {
          return response;
        }
        
        // Not in cache - make a network request and cache the response
        return fetch(event.request).then(networkResponse => {
          // Don't cache if response isn't valid or is an error
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          // Clone the response since we need to use it twice
          let responseToCache = networkResponse.clone();
          
          // Add to cache for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return networkResponse;
        });
      })
      .catch(() => {
        // Fallback for navigation requests if offline
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        
        // Return a friendly error response for other requests
        return new Response(
          `<html>
            <body>
              <h2>You're offline</h2>
              <p>TalkType can't load this resource right now.</p>
              <p><a href="/">Go to home page</a></p>
            </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html' }
          }
        );
      })
  );
});