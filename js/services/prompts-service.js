/* ============================================================
   DEVHUB — SERVICIO DE PROMPTS IA
   ============================================================
   CRUD completo contra la tabla ai_prompts con soporte para
   búsqueda FTS, filtros combinados, paginación, relaciones
   many-to-many con categorías/etiquetas, y operaciones de
   duplicado y favorito.
   ============================================================ */

import { supabase } from '../supabase-client.js';

/* ---- CONSTANTES ---- */

export const PAGE_SIZE = 20;

export const PROMPT_TYPES = [
    { value: 'chatgpt', label: 'ChatGPT' },
    { value: 'claude', label: 'Claude' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'image', label: 'Imagen' },
    { value: 'midjourney', label: 'Midjourney' },
    { value: 'flux', label: 'Flux' },
    { value: 'stable_diffusion', label: 'Stable Diffusion' },
];

export const SORT_OPTIONS = [
    { value: 'updated_desc', label: 'Más recientes', column: 'updated_at', ascending: false },
    { value: 'updated_asc', label: 'Más antiguos', column: 'updated_at', ascending: true },
    { value: 'title_asc', label: 'Título (A-Z)', column: 'title', ascending: true },
    { value: 'title_desc', label: 'Título (Z-A)', column: 'title', ascending: false },
    { value: 'last_used', label: 'Último uso', column: 'last_used_at', ascending: false },
    // { value: 'version', label: 'Versión', column: 'version', ascending: false },
];

/* ---- COLUMNAS DE SELECCIÓN ---- */

const LIST_COLUMNS = `
    id,
    title,
    prompt_type,
    prompt_text,
    negative_prompt,
    provider,
    model_name,
    reference_image_path,
    result_image_path,
    json_content,
    result_text,
    version,
    is_favorite,
    last_used_at,
    created_at,
    updated_at
`;

const DETAIL_COLUMNS = `
    id,
    title,
    prompt_type,
    prompt_text,
    negative_prompt,
    provider,
    model_name,
    json_content,
    result_text,
    notes,
    reference_image_path,
    result_image_path,
    version,
    is_favorite,
    last_used_at,
    created_at,
    updated_at
`;

/* ---- LISTAR PROMPTS ---- */

/**
 * Lista prompts con búsqueda FTS, filtros combinados y paginación.
 *
 * @param {object} options
 * @param {string}  [options.search]     - Texto de búsqueda.
 * @param {object}  [options.filters]    - Filtros activos.
 * @param {string}  [options.sort]       - Clave de ordenamiento.
 * @param {number}  [options.page=0]     - Página (0-indexed).
 * @param {number}  [options.pageSize]   - Registros por página.
 * @returns {Promise<{ success: boolean, data?: Array, total?: number, error?: string }>}
 */
export async function listPrompts({
    search = '',
    filters = {},
    sort = 'updated_desc',
    page = 0,
    pageSize = PAGE_SIZE,
} = {}) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        let query = supabase
            .from('ai_prompts')
            .select(LIST_COLUMNS, { count: 'exact' });

        /* Búsqueda */
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query = query.or(`title.ilike.${searchTerm},prompt_text.ilike.${searchTerm}`);
        }

        /* Filtros */
        if (filters.type) {
            query = query.eq('prompt_type', filters.type);
        }
        if (filters.provider) {
            query = query.ilike('provider', `%${filters.provider}%`);
        }
        if (filters.model) {
            query = query.ilike('model_name', `%${filters.model}%`);
        }
        if (filters.favorite === true) {
            query = query.eq('is_favorite', true);
        }
        if (filters.hasReference === true) {
            query = query.not('reference_image_path', 'is', null);
        }
        if (filters.hasResult === true) {
            query = query.not('result_image_path', 'is', null)
                .not('result_text', 'is', null);
        }
        if (filters.hasJSON === true) {
            query = query.not('json_content', 'is', null);
        }
        if (filters.dateFrom) {
            query = query.gte('updated_at', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.lte('updated_at', filters.dateTo);
        }

        /* Ordenamiento */
        const sortOption = SORT_OPTIONS.find((s) => s.value === sort) || SORT_OPTIONS[0];

        /* Favoritos primero cuando se ordena por recientes */
        if (filters.favorite !== true && sort === 'updated_desc') {
            query = query.order('is_favorite', { ascending: false });
        }

        query = query.order(sortOption.column, {
            ascending: sortOption.ascending,
            nullsFirst: false,
        });

        /* Paginación */
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error al listar prompts:', error.message);
            return { success: false, error: 'No fue posible cargar los prompts.' };
        }

        return { success: true, data: data || [], total: count || 0 };
    } catch (err) {
        console.error('Excepción al listar prompts:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- OBTENER PROMPT CON RELACIONES ---- */

/**
 * Obtiene un prompt con sus categorías y etiquetas.
 * @param {string} id - UUID del prompt.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function getPrompt(id) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select(DETAIL_COLUMNS)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error al obtener prompt:', error.message);
            return { success: false, error: 'No fue posible cargar el prompt.' };
        }

        /* Cargar categorías enlazadas */
        const { data: catLinks } = await supabase
            .from('prompt_category_links')
            .select('category_id, prompt_categories(id, name, color)')
            .eq('prompt_id', id);

        /* Cargar etiquetas enlazadas */
        const { data: tagLinks } = await supabase
            .from('prompt_tag_links')
            .select('tag_id, tags(id, name)')
            .eq('prompt_id', id);

        data.categories = (catLinks || [])
            .map((l) => l.prompt_categories)
            .filter(Boolean);

        data.tags = (tagLinks || [])
            .map((l) => l.tags)
            .filter(Boolean);

        return { success: true, data };
    } catch (err) {
        console.error('Excepción al obtener prompt:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- CREAR PROMPT ---- */

/**
 * Crea un nuevo prompt con sus relaciones.
 * @param {object}   promptData    - Datos del prompt.
 * @param {string[]} categoryIds   - IDs de categorías a enlazar.
 * @param {string[]} tagIds        - IDs de etiquetas a enlazar.
 * @param {string}   userId        - UUID del usuario.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function createPrompt(promptData, categoryIds = [], tagIds = [], userId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const row = {
            user_id: userId,
            title: promptData.title.trim(),
            prompt_type: promptData.prompt_type,
            prompt_text: promptData.prompt_text.trim(),
            negative_prompt: promptData.negative_prompt?.trim() || null,
            provider: promptData.provider?.trim() || null,
            model_name: promptData.model_name?.trim() || null,
            json_content: promptData.json_content || null,
            result_text: promptData.result_text?.trim() || null,
            notes: promptData.notes?.trim() || null,
            reference_image_path: promptData.reference_image_path || null,
            result_image_path: promptData.result_image_path || null,
            version: promptData.version?.trim() || '1',
            is_favorite: promptData.is_favorite || false,
        };

        const { data, error } = await supabase
            .from('ai_prompts')
            .insert(row)
            .select('id')
            .single();

        if (error) {
            console.error('Error al crear prompt:', error.message);
            return { success: false, error: 'No fue posible crear el prompt.' };
        }

        const promptId = data.id;

        /* Enlazar categorías */
        if (categoryIds.length > 0) {
            const catRows = categoryIds.map((cid) => ({
                prompt_id: promptId,
                category_id: cid,
                user_id: userId,
            }));
            await supabase.from('prompt_category_links').insert(catRows);
        }

        /* Enlazar etiquetas */
        if (tagIds.length > 0) {
            const tagRows = tagIds.map((tid) => ({
                prompt_id: promptId,
                tag_id: tid,
                user_id: userId,
            }));
            await supabase.from('prompt_tag_links').insert(tagRows);
        }

        return { success: true, data: { id: promptId } };
    } catch (err) {
        console.error('Excepción al crear prompt:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- ACTUALIZAR PROMPT ---- */

/**
 * Actualiza un prompt y sincroniza sus relaciones.
 * @param {string}   id            - UUID del prompt.
 * @param {object}   promptData    - Datos actualizados.
 * @param {string[]} categoryIds   - Nuevos IDs de categorías.
 * @param {string[]} tagIds        - Nuevos IDs de etiquetas.
 * @param {string}   userId        - UUID del usuario.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updatePrompt(id, promptData, categoryIds = [], tagIds = [], userId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const updates = {};

        if (promptData.title !== undefined) updates.title = promptData.title.trim();
        if (promptData.prompt_type !== undefined) updates.prompt_type = promptData.prompt_type;
        if (promptData.prompt_text !== undefined) updates.prompt_text = promptData.prompt_text.trim();
        if (promptData.negative_prompt !== undefined) updates.negative_prompt = promptData.negative_prompt?.trim() || null;
        if (promptData.provider !== undefined) updates.provider = promptData.provider?.trim() || null;
        if (promptData.model_name !== undefined) updates.model_name = promptData.model_name?.trim() || null;
        if (promptData.json_content !== undefined) updates.json_content = promptData.json_content;
        if (promptData.result_text !== undefined) updates.result_text = promptData.result_text?.trim() || null;
        if (promptData.notes !== undefined) updates.notes = promptData.notes?.trim() || null;
        if (promptData.reference_image_path !== undefined) updates.reference_image_path = promptData.reference_image_path;
        if (promptData.result_image_path !== undefined) updates.result_image_path = promptData.result_image_path;
        if (promptData.version !== undefined) updates.version = promptData.version?.trim() || '1';
        if (promptData.is_favorite !== undefined) updates.is_favorite = promptData.is_favorite;

        const { error } = await supabase
            .from('ai_prompts')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error al actualizar prompt:', error.message);
            return { success: false, error: 'No fue posible actualizar el prompt.' };
        }

        /* Sincronizar categorías: eliminar antiguas e insertar nuevas */
        await supabase
            .from('prompt_category_links')
            .delete()
            .eq('prompt_id', id);

        if (categoryIds.length > 0) {
            const catRows = categoryIds.map((cid) => ({
                prompt_id: id,
                category_id: cid,
                user_id: userId,
            }));
            await supabase.from('prompt_category_links').insert(catRows);
        }

        /* Sincronizar etiquetas */
        await supabase
            .from('prompt_tag_links')
            .delete()
            .eq('prompt_id', id);

        if (tagIds.length > 0) {
            const tagRows = tagIds.map((tid) => ({
                prompt_id: id,
                tag_id: tid,
                user_id: userId,
            }));
            await supabase.from('prompt_tag_links').insert(tagRows);
        }

        return { success: true };
    } catch (err) {
        console.error('Excepción al actualizar prompt:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- ELIMINAR PROMPT ---- */

/**
 * Elimina un prompt y sus imágenes de Storage.
 * Las relaciones (categorías/etiquetas) se eliminan por CASCADE.
 * @param {string} id     - UUID del prompt.
 * @param {string} userId - UUID del usuario.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deletePrompt(id, userId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        /* 1. Eliminar fila (cascade elimina los links) */
        const { error } = await supabase
            .from('ai_prompts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar prompt:', error.message);
            return { success: false, error: 'No fue posible eliminar el prompt.' };
        }

        return { success: true };
    } catch (err) {
        console.error('Excepción al eliminar prompt:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- DUPLICAR PROMPT ---- */

/**
 * Duplica un prompt existente.
 * - Título: "{original} (Copia)"
 * - Versión: "1"
 * - Sin imágenes.
 * - Mantiene categorías y etiquetas.
 * @param {string} id     - UUID del prompt original.
 * @param {string} userId - UUID del usuario.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function duplicatePrompt(id, userId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        /* Obtener prompt original con relaciones */
        const original = await getPrompt(id);
        if (!original.success) return original;

        const src = original.data;
        const categoryIds = (src.categories || []).map((c) => c.id);
        const tagIds = (src.tags || []).map((t) => t.id);

        const newData = {
            title: `${src.title} (Copia)`,
            prompt_type: src.prompt_type,
            prompt_text: src.prompt_text,
            negative_prompt: src.negative_prompt,
            provider: src.provider,
            model_name: src.model_name,
            json_content: src.json_content,
            result_text: src.result_text,
            notes: src.notes,
            reference_image_path: null,
            result_image_path: null,
            version: '1',
            is_favorite: false,
        };

        return await createPrompt(newData, categoryIds, tagIds, userId);
    } catch (err) {
        console.error('Excepción al duplicar prompt:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- FAVORITO ---- */

/**
 * Alterna el estado de favorito de un prompt.
 * @param {string}  id      - UUID del prompt.
 * @param {boolean} current - Estado actual de favorito.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function toggleFavorite(id, current) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { error } = await supabase
            .from('ai_prompts')
            .update({ is_favorite: !current })
            .eq('id', id);

        if (error) {
            console.error('Error al cambiar favorito:', error.message);
            return { success: false, error: 'No fue posible cambiar el estado.' };
        }

        return { success: true };
    } catch (err) {
        console.error('Excepción al cambiar favorito:', err);
        return { success: false, error: 'Error inesperado.' };
    }
}

/* ---- ÚLTIMO USO ---- */

/**
 * Actualiza la fecha de último uso de un prompt.
 * @param {string} id - UUID del prompt.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function updateLastUsed(id) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        await supabase
            .from('ai_prompts')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', id);

        return { success: true };
    } catch {
        return { success: false };
    }
}

/* ---- AUTOCOMPLETADO ---- */

/**
 * Obtiene valores únicos de proveedor usados previamente.
 * @returns {Promise<string[]>}
 */
export async function getDistinctProviders() {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('provider')
            .not('provider', 'is', null)
            .order('provider', { ascending: true });

        if (error) return [];

        const unique = [...new Set(
            (data || []).map((r) => r.provider).filter(Boolean)
        )];
        return unique;
    } catch {
        return [];
    }
}

/**
 * Obtiene valores únicos de modelo usados previamente.
 * @returns {Promise<string[]>}
 */
export async function getDistinctModels() {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('model_name')
            .not('model_name', 'is', null)
            .order('model_name', { ascending: true });

        if (error) return [];

        const unique = [...new Set(
            (data || []).map((r) => r.model_name).filter(Boolean)
        )];
        return unique;
    } catch {
        return [];
    }
}

/* ---- CARGAR RELACIONES PARA UNA LISTA ---- */

/**
 * Carga las categorías y etiquetas para un conjunto de prompts.
 * Útil para la vista de lista, evita N+1 queries.
 * @param {string[]} promptIds - IDs de prompts.
 * @returns {Promise<{ categories: Map, tags: Map }>}
 */
export async function loadRelationsForPrompts(promptIds) {
    const categories = new Map();
    const tags = new Map();

    if (!supabase || promptIds.length === 0) {
        return { categories, tags };
    }

    try {
        /* Cargar categorías */
        const { data: catLinks } = await supabase
            .from('prompt_category_links')
            .select('prompt_id, prompt_categories(id, name, color)')
            .in('prompt_id', promptIds);

        if (catLinks) {
            for (const link of catLinks) {
                if (!categories.has(link.prompt_id)) {
                    categories.set(link.prompt_id, []);
                }
                if (link.prompt_categories) {
                    categories.get(link.prompt_id).push(link.prompt_categories);
                }
            }
        }

        /* Cargar etiquetas */
        const { data: tagLinks } = await supabase
            .from('prompt_tag_links')
            .select('prompt_id, tags(id, name)')
            .in('prompt_id', promptIds);

        if (tagLinks) {
            for (const link of tagLinks) {
                if (!tags.has(link.prompt_id)) {
                    tags.set(link.prompt_id, []);
                }
                if (link.tags) {
                    tags.get(link.prompt_id).push(link.tags);
                }
            }
        }
    } catch (err) {
        console.warn('Error cargando relaciones:', err);
    }

    return { categories, tags };
}
