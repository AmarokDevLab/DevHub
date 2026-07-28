/* ============================================================
   DEVHUB — SERVICIO DE CATEGORÍAS
   ============================================================
   CRUD para la tabla prompt_categories, privada por usuario.
   Incluye seed de categorías sugeridas en el primer acceso.
   ============================================================ */

import { supabase } from '../supabase-client.js';

/* ---- CATEGORÍAS SUGERIDAS ---- */

const DEFAULT_CATEGORIES = [
    'Desarrollo',
    'Diseño',
    'Fotografía',
    'Marketing',
    'Escritura',
    'Investigación',
    'Productividad',
    'Video',
    'Imagen',
];

/* ---- OPERACIONES ---- */

/**
 * Lista todas las categorías del usuario actual, ordenadas por nombre.
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
export async function listCategories() {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { data, error } = await supabase
            .from('prompt_categories')
            .select('id, name, color, icon, created_at')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error al listar categorías:', error.message);
            return { success: false, error: 'No fue posible cargar las categorías.' };
        }

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('Excepción al listar categorías:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/**
 * Crea una nueva categoría para el usuario actual.
 * Normaliza el nombre para evitar duplicados.
 * @param {string} name  - Nombre de la categoría.
 * @param {string} userId - UUID del usuario.
 * @param {string|null} [color=null] - Color hex (#RRGGBB).
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function createCategory(name, userId, color = null) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) {
        return { success: false, error: 'El nombre debe tener entre 1 y 60 caracteres.' };
    }

    try {
        const { data, error } = await supabase
            .from('prompt_categories')
            .insert({
                user_id: userId,
                name: trimmed,
                color,
            })
            .select('id, name, color, icon, created_at')
            .single();

        if (error) {
            /* Duplicado por constraint unique */
            if (error.code === '23505') {
                return { success: false, error: 'Ya existe una categoría con ese nombre.' };
            }
            console.error('Error al crear categoría:', error.message);
            return { success: false, error: 'No fue posible crear la categoría.' };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Excepción al crear categoría:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/**
 * Elimina una categoría por su ID.
 * Los enlaces prompt_category_links se eliminan en cascada.
 * @param {string} categoryId - UUID de la categoría.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteCategory(categoryId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { error } = await supabase
            .from('prompt_categories')
            .delete()
            .eq('id', categoryId);

        if (error) {
            console.error('Error al eliminar categoría:', error.message);
            return { success: false, error: 'No fue posible eliminar la categoría.' };
        }

        return { success: true };
    } catch (err) {
        console.error('Excepción al eliminar categoría:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/**
 * Crea las categorías sugeridas si el usuario no tiene ninguna.
 * Se ejecuta una sola vez al primer acceso al módulo.
 * @param {string} userId - UUID del usuario.
 * @returns {Promise<void>}
 */
export async function seedDefaultCategories(userId) {
    if (!supabase) return;

    try {
        /* Verificar si ya tiene categorías */
        const { count, error: countError } = await supabase
            .from('prompt_categories')
            .select('id', { count: 'exact', head: true });

        if (countError) {
            console.warn('Error al verificar categorías existentes:', countError.message);
            return;
        }

        if (count > 0) return;

        /* Insertar categorías por defecto */
        const rows = DEFAULT_CATEGORIES.map((name) => ({
            user_id: userId,
            name,
        }));

        const { error } = await supabase
            .from('prompt_categories')
            .insert(rows);

        if (error) {
            console.warn('Error al crear categorías por defecto:', error.message);
        }
    } catch (err) {
        console.warn('Excepción al sembrar categorías:', err);
    }
}
