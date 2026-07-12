const CACHE_NAME = 'devhub-cache-v4';
const urlsToCache = [
    './',
    './index.html',
    './dashboard.html',
    './prompts.html',
    './settings.html',
    './css/variables.css',
    './css/components.css',
    './css/auth.css',
    './css/prompts.css',
    './css/settings.css',
    './js/theme-service.js',
    './assets/logo.svg',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
