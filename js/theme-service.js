/* ============================================================
   DEVHUB — SERVICIO DE TEMA (DARK / LIGHT)
   ============================================================ */

const STORAGE_KEY = 'devhub-theme';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

export const THEMES = Object.freeze({
    LIGHT: 'light',
    DARK: 'dark',
});

const THEME_COLORS = Object.freeze({
    [THEMES.LIGHT]: '#f3f7fc',
    [THEMES.DARK]: '#0f172a',
});

export function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEMES.DARK || saved === THEMES.LIGHT) return saved;
    return window.matchMedia?.(SYSTEM_QUERY).matches ? THEMES.DARK : THEMES.LIGHT;
}

function ensureMeta(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
    }
    meta.content = content;
}

function updateBrowserChrome(theme) {
    const color = THEME_COLORS[theme];
    ensureMeta('theme-color', color);
    ensureMeta('msapplication-navbutton-color', color);
    document.documentElement.style.backgroundColor = color;
    if (document.body) document.body.style.backgroundColor = color;
}

function applyThemeToDOM(theme) {
    const validTheme = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    const root = document.documentElement;

    root.classList.toggle('dark-theme', validTheme === THEMES.DARK);
    root.dataset.bsTheme = validTheme;
    root.style.colorScheme = validTheme;
    updateBrowserChrome(validTheme);

    window.dispatchEvent(new CustomEvent('devhub:themechange', {
        detail: { theme: validTheme, color: THEME_COLORS[validTheme] },
    }));
}

export function setTheme(theme) {
    const validTheme = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
    localStorage.setItem(STORAGE_KEY, validTheme);
    applyThemeToDOM(validTheme);
}

export function initTheme() {
    applyThemeToDOM(getSavedTheme());

    const media = window.matchMedia?.(SYSTEM_QUERY);
    if (media && !localStorage.getItem(STORAGE_KEY) && !window.__devhubThemeListener) {
        const handler = event => applyThemeToDOM(event.matches ? THEMES.DARK : THEMES.LIGHT);
        media.addEventListener?.('change', handler);
        window.__devhubThemeListener = handler;
    }
}

export function toggleTheme() {
    const next = getSavedTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setTheme(next);
    return next;
}
