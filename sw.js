const CACHE_NAME = 'devhub-cache-v25';
const APP_SHELL = [
    './',
    './index.html',
    './dashboard.html',
    './proyectos.html',
    './prompts.html',
    './biblioteca.html',
    './settings.html',
    './404.html',
    './css/variables.css',
    './css/components.css',
    './css/app-shell.css',
    './css/auth.css',
    './css/dashboard.css',
    './css/projects.css',
    './css/prompts.css',
    './css/library.css',
    './css/settings.css',
    './js/config.js',
    './js/supabase-client.js',
    './js/auth-service.js',
    './js/auth-ui.js',
    './js/app.js',
    './js/coffee-loader.js',
    './js/projects-app.js',
    './js/profile-service.js',
    './js/theme-bootstrap.js',
    './js/theme-service.js',
    './js/prompts-app.js',
    './js/library-app.js',
    './js/services/library-items-service.js',
    './js/services/library-categories-service.js',
    './js/services/library-tags-service.js',
    './js/services/library-storage-service.js',
    './js/services/project-service.js',
    './js/services/technology-service.js',
    './js/services/project-summary-service.js',
    './js/services/prompt-sharing-service.js',
    './js/components/project-card.js',
    './js/components/project-filters.js',
    './js/components/project-form.js',
    './js/components/project-detail.js',
    './js/utils/debounce.js',
    './js/utils/clipboard.js',
    './js/utils/mobile-viewport.js',
    './js/validators.js',
    './assets/projects-empty.svg',
    './assets/logo.svg',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/icon-maskable-512.png',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            if (response.ok && response.type === 'basic') {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, response.clone());
            }
            return response;
        } catch {
            const cached = await caches.match(request);
            if (cached) return cached;
            if (request.mode === 'navigate') return caches.match('./404.html');
            throw new Error('Recurso no disponible sin conexión');
        }
    })());
});
