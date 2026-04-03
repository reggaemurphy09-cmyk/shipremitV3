const CACHE_NAME = ‘shipremit-v2’;
const BASE = ‘https://reggaemurphy09-cmyk.github.io’;

// All files to cache on install
const FILES_TO_CACHE = [
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
// Firebase SDKs
‘https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js’,
‘https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js’,
‘https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js’,
// Google Fonts
‘https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:wght@300;400;500;600&display=swap’,
];

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
