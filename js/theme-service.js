/* ============================================================
   DEVHUB — SERVICIO DE TEMA (DARK / LIGHT)
   ============================================================
   Gestiona la preferencia de tema del usuario:
   - Persiste la elección en localStorage.
   - Aplica la clase `dark-theme` al <html>.
   - Respeta la preferencia del sistema como fallback.
   ============================================================ */

const STORAGE_KEY = 'devhub-theme';

/**
 * Temas disponibles.
 * @readonly
 */
export const THEMES = Object.freeze({
    LIGHT: 'light',
    DARK: 'dark',
});

/**
 * Obtiene el tema guardado en localStorage, o detecta la
 * preferencia del sistema operativo como fallback.
 * @returns {'light' | 'dark'}
 */
export function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEMES.DARK || saved === THEMES.LIGHT) {
        return saved;
    }

    /* Fallback: preferencia del sistema */
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEMES.DARK;
    }

    return THEMES.LIGHT;
}

/**
 * Guarda la preferencia de tema y aplica la clase en el DOM.
 * @param {'light' | 'dark'} theme
 */
export function setTheme(theme) {
    const validTheme = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;

    localStorage.setItem(STORAGE_KEY, validTheme);
    applyThemeToDOM(validTheme);
}

/**
 * Aplica el tema al DOM sin guardarlo (útil para la carga inicial).
 * @param {'light' | 'dark'} theme
 */
function applyThemeToDOM(theme) {
    const root = document.documentElement;

    if (theme === THEMES.DARK) {
        root.classList.add('dark-theme');
    } else {
        root.classList.remove('dark-theme');
    }
}

/**
 * Inicializa el tema al cargar la página.
 * Debe invocarse lo antes posible (antes de render) para evitar FOUC.
 */
export function initTheme() {
    const theme = getSavedTheme();
    applyThemeToDOM(theme);
}

/**
 * Alterna entre tema claro y oscuro.
 * @returns {'light' | 'dark'} El nuevo tema aplicado.
 */
export function toggleTheme() {
    const current = getSavedTheme();
    const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setTheme(next);
    return next;
}
