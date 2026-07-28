/* ============================================================
   DEVHUB — CLIENTE SUPABASE (SINGLETON)
   ============================================================
   Inicializa el cliente de Supabase una sola vez y lo exporta
   para uso en todos los módulos de la aplicación.
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, isPlaceholderConfig } from './config.js';

/**
 * El cliente será null si las credenciales son placeholders.
 * Todos los módulos que lo importen deben verificar que no sea null.
 */
let _supabase = null;

if (!isPlaceholderConfig()) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

export const supabase = _supabase;
