/* ============================================================
   DEVHUB — SERVICIO DE ETIQUETAS
   ============================================================
   CRUD para la tabla tags, privada por usuario.
   ============================================================ */

import { supabase } from '../supabase-client.js';

/* ---- OPERACIONES ---- */

/**
 * Lista todas las etiquetas del usuario actual, ordenadas por nombre.
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
export async function listTags() {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { data, error } = await supabase
            .from('tags')
            .select('id, name, created_at')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error al listar etiquetas:', error.message);
            return { success: false, error: 'No fue posible cargar las etiquetas.' };
        }

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('Excepción al listar etiquetas:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/**
 * Crea una nueva etiqueta para el usuario actual.
 * @param {string} name   - Nombre de la etiqueta.
 * @param {string} userId - UUID del usuario.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function createTag(name, userId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) {
        return { success: false, error: 'El nombre debe tener entre 1 y 50 caracteres.' };
    }

    const normalizedName = trimmed.toLocaleLowerCase('es-MX');

    try {
        const insertTag = async (includeNormalizedName) => {
            const payload = { user_id: userId, name: trimmed };
            if (includeNormalizedName) payload.normalized_name = normalizedName;
            return supabase.from('tags').insert(payload).select('id, name, created_at').single();
        };

        let response = await insertTag(true);
        // Compatibilidad temporal con instalaciones antiguas donde
        // normalized_name era una columna GENERATED.
        if (response.error && ['428C9', 'PGRST204'].includes(response.error.code)) {
            response = await insertTag(false);
        }

        const { data, error } = response;
        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'Ya existe una etiqueta con ese nombre.' };
            }
            console.error('Error al crear etiqueta:', error.message);
            return { success: false, error: 'No fue posible crear la etiqueta.' };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Excepción al crear etiqueta:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/**
 * Elimina una etiqueta por su ID.
 * Los enlaces prompt_tag_links se eliminan en cascada.
 * @param {string} tagId - UUID de la etiqueta.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteTag(tagId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId);

        if (error) {
            console.error('Error al eliminar etiqueta:', error.message);
            return { success: false, error: 'No fue posible eliminar la etiqueta.' };
        }

        return { success: true };
    } catch (err) {
        console.error('Excepción al eliminar etiqueta:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}
