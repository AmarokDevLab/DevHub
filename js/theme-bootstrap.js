/* Aplica el tema antes del primer render para evitar parpadeos y
   sincronizar de inmediato la barra del navegador/PWA. */
(function () {
    'use strict';

    var STORAGE_KEY = 'devhub-theme';
    var saved = localStorage.getItem(STORAGE_KEY);
    var theme = saved === 'dark' || saved === 'light'
        ? saved
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var color = theme === 'dark' ? '#0f172a' : '#f3f7fc';
    var root = document.documentElement;

    root.classList.toggle('dark-theme', theme === 'dark');
    root.setAttribute('data-bs-theme', theme);
    root.style.colorScheme = theme;
    root.style.backgroundColor = color;

    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', color);

    var navMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (navMeta) navMeta.setAttribute('content', color);

    window.__DEVHUB_INITIAL_THEME__ = theme;
})();
