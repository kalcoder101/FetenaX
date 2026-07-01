// sw.js — FetenaX v34 Service Worker
// Caches app shell + assets for offline use.
// Strategy:
//   - Precache core files on install (app shell)
//   - Cache-first for static assets (CSS, JS, images, fonts)
//   - Network-first for API requests (always try to get fresh data, fall back to cache)
//   - Stale-while-revalidate for everything else

var CACHE_VERSION = 'fetenax-v34';
var CACHE_STATIC  = CACHE_VERSION + '-static';
var CACHE_RUNTIME = CACHE_VERSION + '-runtime';

// Files to precache on install (app shell).
// Note: PHP files are NOT cached (they need server-side execution).
var PRECACHE_URLS = [
    './',
    './index.php',
    './css/theme.css',
    './css/components.css',
    './css/layout.css',
    './css/auth.css',
    './css/student.css',
    './css/teacher.css',
    './css/exam-interface.css',
    './css/results.css',
    './css/exam-creation.css',
    './css/study.css',
    './css/question-renderer.css',
    './css/responsive.css',
    './js/core.js',
    './js/auth.js',
    './js/dashboard.js',
    './js/student.js',
    './js/teacher.js',
    './js/exam.js',
    './js/exam-creation.js',
    './js/study.js',
    './js/question-renderer.js',
    './js/app.js',
    './Img/fetenAX.png',
    './Img/organic_background.png',
    './manifest.json'
];

// Install: precache app shell
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_STATIC).then(function (cache) {
            // Cache files individually so one failure doesn't abort all
            return Promise.all(
                PRECACHE_URLS.map(function (url) {
                    return cache.add(url).catch(function (err) {
                        console.warn('[SW] Failed to precache:', url, err);
                    });
                })
            );
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

// Activate: clean up old caches
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (key) {
                    return key.indexOf(CACHE_VERSION) !== 0;
                }).map(function (key) {
                    return caches.delete(key);
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// Fetch: route by request type
self.addEventListener('fetch', function (event) {
    var req = event.request;

    // Only handle GET requests
    if (req.method !== 'GET') return;

    var url = new URL(req.url);

    // Skip cross-origin requests (e.g. CDN fonts, Prism.js)
    // We let them go to network; the browser cache will handle them.
    if (url.origin !== self.location.origin) {
        return;
    }

    // Skip api.php requests — they always need network (live data)
    if (url.pathname.indexOf('api.php') !== -1) {
        // Network-first for API; fall back to cached response if offline
        event.respondWith(
            fetch(req).catch(function () {
                return caches.match(req).then(function (cached) {
                    if (cached) return cached;
                    return new Response(
                        JSON.stringify({ status: 'error', message: 'You appear to be offline. Please reconnect to continue.' }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                });
            })
        );
        return;
    }

    // For navigation requests (HTML pages): network-first, fall back to cached index.php
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(function () {
                return caches.match('./index.php');
            })
        );
        return;
    }

    // For static assets (CSS, JS, images): cache-first, then network
    event.respondWith(
        caches.match(req).then(function (cached) {
            if (cached) {
                // Revalidate in background
                fetch(req).then(function (resp) {
                    if (resp && resp.status === 200) {
                        caches.open(CACHE_RUNTIME).then(function (cache) {
                            cache.put(req, resp.clone());
                        });
                    }
                }).catch(function () { /* offline, keep cached version */ });
                return cached;
            }
            // Not in cache — fetch and cache
            return fetch(req).then(function (resp) {
                if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
                var respClone = resp.clone();
                caches.open(CACHE_RUNTIME).then(function (cache) {
                    cache.put(req, respClone);
                });
                return resp;
            });
        })
    );
});

// Listen for messages from the page (e.g. "skip waiting" for instant update)
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
