/* ============================================================
   DEVHUB — SERVICIO DE CATEGORÍAS DE BIBLIOTECA
   ============================================================ */

import { supabase } from '../supabase-client.js';

/**
 * Obtiene las categorías del usuario.
 */
export async function getCategories(userId) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado', data: [] };

    try {
        const { data, error } = await supabase
            .from('library_categories')
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
 * Crea una categoría nueva.
 */
export async function createCategory(userId, categoryData) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado' };

    try {
        const { data, error } = await supabase
            .from('library_categories')
            .insert({
                user_id: userId,
                name: categoryData.name.trim(),
                normalized_name: categoryData.name.trim().toLowerCase(),
                color: categoryData.color || null,
                icon: categoryData.icon || null,
            })
            .select()
            .single();

        if (error) return { success: false, error: error.message };
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
