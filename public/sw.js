/* OrbitView service worker */
const VERSION = 'v4.0.0';
const CACHE_PREFIX = 'orbitview-';
const STATIC_CACHE = `${CACHE_PREFIX}${VERSION}`; // precached shell assets + /_next/static
const CESIUM_CACHE = `${CACHE_PREFIX}cesium-${VERSION}`; // /cesium/ runtime assets
const PAGES_CACHE = `${CACHE_PREFIX}pages-${VERSION}`; // navigations (network-first)
const CURRENT_CACHES = [STATIC_CACHE, CESIUM_CACHE, PAGES_CACHE];

// Legacy caches created by older versions of this worker
const LEGACY_CACHES = ['data-cache'];

const MAX_ENTRIES = {
    [STATIC_CACHE]: 200,
    [CESIUM_CACHE]: 300,
    [PAGES_CACHE]: 20,
};

const PRECACHE_ASSETS = [
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/favicon.svg',
];

const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OrbitView - Offline</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#eef0f5;color:#101218;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:16px}
main{background:#fff;border-radius:24px;padding:28px;max-width:340px;box-shadow:0 14px 36px rgba(16,18,24,.14)}
h1{font-size:20px;margin:0 0 8px}p{color:#636878;margin:0}
button{margin-top:18px;height:40px;padding:0 18px;border-radius:999px;border:0;background:#3466f2;color:#fff;font-weight:600;cursor:pointer}
</style></head>
<body><main><h1>You are offline</h1>
<p>OrbitView needs a connection to load. / OrbitView'i açmak için bağlantı gerekiyor.</p>
<button onclick="location.reload()">Retry / Tekrar dene</button></main></body></html>`;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) =>
            // Best effort: a missing asset must not break installation
            Promise.all(PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => undefined)))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names
                    .filter((name) =>
                        LEGACY_CACHES.includes(name) ||
                        (name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name)))
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

function isCacheable(response) {
    // Only full, same-origin (basic) 200 responses; skip 206 partials, opaque, errors
    return response && response.status === 200 && response.type === 'basic';
}

async function trimCache(cacheName) {
    const max = MAX_ENTRIES[cacheName];
    if (!max) return;
    const cache = await caches.open(cacheName);
    const keys = await cache.keys(); // insertion order: oldest first
    if (keys.length <= max) return;
    await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

async function putInCache(cacheName, request, response) {
    try {
        const cache = await caches.open(cacheName);
        await cache.put(request, response);
        await trimCache(cacheName);
    } catch {
        // Quota or other storage errors: ignore, the network response was already served
    }
}

async function cacheFirst(event, cacheName) {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    const response = await fetch(event.request);
    if (isCacheable(response)) {
        event.waitUntil(putInCache(cacheName, event.request, response.clone()));
    }
    return response;
}

async function networkFirstNavigation(event) {
    try {
        const response = await fetch(event.request);
        if (isCacheable(response)) {
            event.waitUntil(putInCache(PAGES_CACHE, event.request, response.clone()));
        }
        return response;
    } catch {
        const cached = await caches.match(event.request, { cacheName: PAGES_CACHE });
        if (cached) return cached;
        return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        });
    }
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Never handle cross-origin requests (CelesTrak, NOAA, Cesium Ion, tiles, ...)
    if (url.origin !== self.location.origin) return;

    // Live data APIs must always hit the network (they manage their own freshness)
    if (url.pathname.startsWith('/api/')) return;

    // Range requests produce 206 responses that can't be cached
    if (request.headers.has('range')) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(event));
        return;
    }

    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirst(event, STATIC_CACHE));
        return;
    }

    if (url.pathname.startsWith('/cesium/')) {
        event.respondWith(cacheFirst(event, CESIUM_CACHE));
        return;
    }

    if (PRECACHE_ASSETS.includes(url.pathname)) {
        event.respondWith(cacheFirst(event, STATIC_CACHE));
    }
    // Everything else: default browser handling (network)
});
