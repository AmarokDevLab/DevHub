/* ============================================================
   DEVHUB — SERVICIO DE PERFILES
   ============================================================
   Consulta la tabla public.profiles protegida por RLS.
   Maneja inconsistencias sin romper la aplicación.
   ============================================================ */

import { supabase } from './supabase-client.js';

/**
 * Obtiene el perfil del usuario desde public.profiles.
 * Si no existe o hay un error, devuelve un perfil de fallback
 * usando los metadatos de auth.users.
 *
 * @param {object} user - Objeto user de Supabase Auth
 * @returns {Promise<{ displayName: string, email: string }>}
 */
export async function getProfile(user) {
    const fallbackName = user.user_metadata?.display_name || 'Desarrollador';
    const email = user.email || '';

    if (!supabase) {
        return { displayName: fallbackName, email };
    }

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            console.warn('Advertencia al consultar perfil (RLS):', error.message);
            return { displayName: fallbackName, email };
        }

        if (profile && profile.display_name) {
            return { displayName: profile.display_name, email };
        }

        return { displayName: fallbackName, email };
    } catch (err) {
        console.error('Error crítico al recuperar perfil:', err);
        return { displayName: fallbackName, email };
    }
}
