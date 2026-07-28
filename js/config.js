/* ============================================================
   DEVHUB — CONFIGURACIÓN PÚBLICA DE SUPABASE
   ============================================================
   Estas credenciales son PÚBLICAS por diseño. La seguridad
   de los datos NO depende de mantener estas claves en secreto,
   sino de las políticas Row Level Security (RLS) configuradas
   en las tablas de Supabase.

   NUNCA coloques aquí la clave service_role, secret keys,
   contraseñas administrativas ni tokens permanentes.
   ============================================================ */

export const SUPABASE_URL = 'https://hltvvvzqheckexcmmjcj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_1nLC5ghMDWTTIA2aShPkgg_5y1K7VNV';

/*
 * Calcula la ruta base del proyecto para soportar despliegue
 * en subcarpetas de GitHub Pages (ej: /devhub/).
 */
function getBasePath() {
    const path = window.location.pathname;
    /* Si la ruta termina en un archivo .html, tomamos el directorio padre */
    if (path.endsWith('.html')) {
        return path.substring(0, path.lastIndexOf('/') + 1);
    }
    /* Si no termina en /, la añadimos */
    return path.endsWith('/') ? path : path + '/';
}

const BASE_PATH = getBasePath();

/** URL de callback para redirecciones de Supabase (confirmación, recovery) */
export const AUTH_CALLBACK_URL = window.location.origin + BASE_PATH + 'index.html';

/** URL de la página de autenticación */
export const LOGIN_URL = BASE_PATH + 'index.html';

/** URL del dashboard privado */
export const DASHBOARD_URL = BASE_PATH + 'dashboard.html';

/** URL del módulo Prompts IA */
export const PROMPTS_URL = BASE_PATH + 'prompts.html';

/**
 * Verifica si las credenciales han sido configuradas.
 * Devuelve true si todavía contienen placeholders.
 */
export function isPlaceholderConfig() {
    return (
        SUPABASE_URL.includes('TU_SUPABASE_URL') ||
        SUPABASE_URL.includes('TU_PROYECTO') ||
        SUPABASE_PUBLISHABLE_KEY.includes('TU_PUBLISHABLE_ANON_KEY') ||
        !SUPABASE_URL ||
        !SUPABASE_PUBLISHABLE_KEY
    );
}
