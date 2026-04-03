const CACHE_NAME = ‘shipremit-v3’;
const BASE = ‘https://reggaemurphy09-cmyk.github.io’;

const FILES_TO_CACHE = [
BASE + ‘/’,
BASE + ‘/login.html’,
BASE + ‘/register.html’,
BASE + ‘/dashboard.html’,
BASE + ‘/send.html’,
BASE + ‘/transactions.html’,
BASE + ‘/recipients.html’,
BASE + ‘/profile.html’,
BASE + ‘/forgot.html’,
BASE + ‘/notifications.html’,
BASE + ‘/support.html’,
BASE + ‘/admin.html’,
BASE + ‘/manifest.json’,
BASE + ‘/icon-192.png’,
BASE + ‘/icon-512.png’,
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener(‘install’, event => {
self.skipWaiting();
event.waitUntil(
caches.open(CACHE_NAME).then(cache => {
return Promise.allSettled(
FILES_TO_CACHE.map(url => cache.add(url).catch(() => {}))
);
})
);
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
).then(() => self.clients.claim())
);
});

// ── Fetch: Network first, fallback to cache ───────────────────────────────────
// Network-first strategy works better on iOS Safari for PWA
self.addEventListener(‘fetch’, event => {
const url = new URL(event.request.url);

// Skip non-GET requests
if (event.request.method !== ‘GET’) return;

// Skip Firebase, ImgBB — always network
if (
url.hostname.includes(‘firebaseio.com’) ||
url.hostname.includes(‘googleapis.com’) ||
url.hostname.includes(‘firebaseapp.com’) ||
url.hostname.includes(‘imgbb.com’)
) return;

// Network first → fallback to cache
event.respondWith(
fetch(event.request)
.then(response => {
// Cache fresh copy
if (response && response.status === 200) {
const clone = response.clone();
caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
}
return response;
})
.catch(() => {
// Network failed → serve from cache
return caches.match(event.request).then(cached => {
if (cached) return cached;
// Final fallback
return caches.match(BASE + ‘/dashboard.html’);
});
})
);
});

// ── Install: cache all files ──────────────────────────────────────────────────
self.addEventListener(‘install’, event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache => {
console.log(’[SW] Caching app shell…’);
// Cache what we can, skip failures
return Promise.allSettled(
FILES_TO_CACHE.map(url =>
cache.add(url).catch(err => console.warn(’[SW] Failed to cache:’, url, err))
)
);
}).then(() => self.skipWaiting())
);
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys.filter(key => key !== CACHE_NAME)
.map(key => {
console.log(’[SW] Deleting old cache:’, key);
return caches.delete(key);
})
)
).then(() => self.clients.claim())
);
});

// ── Fetch: serve from cache, fallback to network ──────────────────────────────
self.addEventListener(‘fetch’, event => {
const { request } = event;
const url = new URL(request.url);

// Always go network-first for Firebase API calls (real-time data)
if (
url.hostname.includes(‘firebaseio.com’) ||
url.hostname.includes(‘firebase.googleapis.com’) ||
url.hostname.includes(‘identitytoolkit.googleapis.com’) ||
url.hostname.includes(‘securetoken.googleapis.com’) ||
url.hostname.includes(‘imgbb.com’)
) {
event.respondWith(
fetch(request).catch(() => {
// If Firebase fails, return a simple offline JSON response
return new Response(JSON.stringify({ offline: true }), {
headers: { ‘Content-Type’: ‘application/json’ }
});
})
);
return;
}

// Cache-first for app files (HTML, JS, CSS, fonts)
event.respondWith(
caches.match(request).then(cached => {
if (cached) {
// Serve from cache, update cache in background
fetch(request).then(response => {
if (response && response.status === 200) {
caches.open(CACHE_NAME).then(cache => cache.put(request, response));
}
}).catch(() => {});
return cached;
}

```
  // Not in cache — fetch from network and cache it
  return fetch(request).then(response => {
    if (!response || response.status !== 200) return response;
    const responseClone = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
    return response;
  }).catch(() => {
    // Offline fallback for HTML pages
    if (request.destination === 'document') {
      return caches.match(BASE + '/dashboard.html');
    }
  });
})
```

);
});

// ── Message: force update ─────────────────────────────────────────────────────
self.addEventListener(‘message’, event => {
if (event.data === ‘skipWaiting’) self.skipWaiting();
});
