/* ============================================================
   DEVHUB — SERVICIO DE ETIQUETAS DE BIBLIOTECA
   ============================================================ */

import { supabase } from '../supabase-client.js';

/**
 * Obtiene las etiquetas del usuario.
 */
export async function getLibraryTags(userId) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado', data: [] };

    try {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });

        if (error) return { success: false, error: error.message, data: [] };
        return { success: true, data: data || [] };
    } catch (e) {
        return { success: false, error: e.message, data: [] };
    }
}

/**
 * Crea una etiqueta nueva. Si ya existe para el usuario,
 * devuelve el registro existente.
 */
export async function createLibraryTag(userId, tagData) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado' };

    const displayName = tagData.name.trim();
    const normalizedName = displayName.toLocaleLowerCase('es-MX');

    try {
        const insertTag = async (mode = 'canonical') => {
            const payload = { user_id: userId, name: displayName };
            if (mode !== 'legacy-generated') payload.normalized_name = normalizedName;
            if (mode === 'canonical') payload.color = tagData.color || null;
            return supabase.from('tags').insert(payload).select().single();
        };

        let response = await insertTag('canonical');
        if (response.error?.code === 'PGRST204') response = await insertTag('without-color');
        if (response.error?.code === '428C9') response = await insertTag('legacy-generated');

        const { data, error } = response;
        if (error) {
            if (error.code === '23505') {
                const { data: existing, error: findError } = await supabase
                    .from('tags')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('normalized_name', normalizedName)
                    .single();

                if (findError) return { success: false, error: findError.message };
                return { success: true, data: existing };
            }
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

