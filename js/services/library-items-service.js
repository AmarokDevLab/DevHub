/* ============================================================
   DEVHUB — SERVICIO PRINCIPAL DE BIBLIOTECA
   ============================================================ */

import { supabase } from '../supabase-client.js';

const PAGE_SIZE = 24;

/**
 * Obtiene elementos de la biblioteca con filtros y paginación.
 */
export async function getLibraryItems(userId, params = {}) {
    if (!userId || !supabase) {
        return { success: false, error: 'No autenticado', data: [], count: 0 };
    }

    const {
        page = 1,
        limit = PAGE_SIZE,
        search = '',
        resourceType = '',
        categoryId = '',
        projectId = '',
        tagId = '',
        dateFrom = '',
        dateTo = '',
        isPinned = null,
        isArchived = null,
        orderBy = 'recent'
    } = params;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
        /*
         * Se consultan primero los recursos sin relaciones anidadas.
         * Así, una relación desactualizada en la caché de PostgREST no
         * impide mostrar los registros principales de la Biblioteca.
         */
        /*
         * No agregamos un filtro manual por user_id. Las políticas RLS son
         * la fuente de verdad y ya limitan la consulta al usuario autenticado.
         * Esto replica el patrón que usa correctamente el módulo Prompts.
         */
        let itemIdsForTag = null;
        if (tagId) {
            const { data: tagRelations, error: tagError } = await supabase
                .from('library_item_tags')
                .select('library_item_id')
                .eq('user_id', userId)
                .eq('tag_id', tagId);

            if (tagError) {
                return { success: false, error: tagError.message, data: [], count: 0 };
            }

            itemIdsForTag = [...new Set((tagRelations || []).map(row => row.library_item_id))];
            if (itemIdsForTag.length === 0) {
                return { success: true, data: [], count: 0 };
            }
        }

        let query = supabase
            .from('library_items')
            .select('*', { count: 'exact' });

        if (itemIdsForTag) query = query.in('id', itemIdsForTag);
        if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);

        if (isArchived !== null && isArchived !== undefined) {
            query = query.eq('is_archived', isArchived);
        }
        if (resourceType) query = query.eq('resource_type', resourceType);
        if (categoryId) query = query.eq('category_id', categoryId);
        if (projectId) query = query.eq('project_id', projectId);
        if (isPinned !== null && isPinned !== undefined) {
            query = query.eq('is_pinned', isPinned);
        }

        if (search) {
            const safeSearch = search.replace(/[,%()]/g, ' ').trim();
            if (safeSearch) {
                query = query.or(
                    `title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,url.ilike.%${safeSearch}%,personal_notes.ilike.%${safeSearch}%`
                );
            }
        }

        switch (orderBy) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'updated':
                query = query.order('updated_at', { ascending: false });
                break;
            case 'az':
                query = query.order('title', { ascending: true });
                break;
            case 'pinned':
                query = query.order('is_pinned', { ascending: false })
                    .order('created_at', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        const { data: baseItems, count, error } = await query.range(from, to);

        if (error) {
            console.error('Error consultando library_items:', error);
            return { success: false, error: error.message, data: [], count: 0 };
        }

        const items = baseItems || [];
        if (items.length === 0) {
            return { success: true, data: [], count: Number.isFinite(count) ? count : 0 };
        }

        const hydratedItems = await hydrateLibraryItems(userId, items);
        return {
            success: true,
            data: hydratedItems,
            count: Number.isFinite(count) ? count : hydratedItems.length,
        };
    } catch (e) {
        console.error('Exception in getLibraryItems:', e);
        return { success: false, error: e.message, data: [], count: 0 };
    }
}

/**
 * Agrega categoría y etiquetas mediante consultas independientes.
 * Si una consulta secundaria falla, los recursos se muestran de todos modos.
 */
async function hydrateLibraryItems(userId, items) {
    const categoryIds = [...new Set(items.map(item => item.category_id).filter(Boolean))];
    const itemIds = items.map(item => item.id);

    const categoryPromise = categoryIds.length > 0
        ? supabase
            .from('library_categories')
            .select('id, name, color, icon')
            .eq('user_id', userId)
            .in('id', categoryIds)
        : Promise.resolve({ data: [], error: null });

    const relationsPromise = itemIds.length > 0
        ? supabase
            .from('library_item_tags')
            .select('library_item_id, tag_id')
            .eq('user_id', userId)
            .in('library_item_id', itemIds)
        : Promise.resolve({ data: [], error: null });

    const [categoryResult, relationsResult] = await Promise.all([
        categoryPromise,
        relationsPromise,
    ]);

    if (categoryResult.error) {
        console.warn('No se pudieron cargar categorías de Biblioteca:', categoryResult.error.message);
    }
    if (relationsResult.error) {
        console.warn('No se pudieron cargar relaciones de etiquetas:', relationsResult.error.message);
    }

    const categories = categoryResult.data || [];
    const relations = relationsResult.data || [];
    const tagIds = [...new Set(relations.map(row => row.tag_id).filter(Boolean))];

    let tags = [];
    if (tagIds.length > 0) {
        const { data, error } = await supabase
            .from('tags')
            .select('id, name')
            .eq('user_id', userId)
            .in('id', tagIds);

        if (error) {
            console.warn('No se pudieron cargar etiquetas de Biblioteca:', error.message);
        } else {
            tags = data || [];
        }
    }

    const categoryMap = new Map(categories.map(category => [category.id, category]));
    const tagMap = new Map(tags.map(tag => [tag.id, tag]));
    const relationsByItem = new Map();

    for (const relation of relations) {
        if (!relationsByItem.has(relation.library_item_id)) {
            relationsByItem.set(relation.library_item_id, []);
        }
        relationsByItem.get(relation.library_item_id).push({
            tags: tagMap.get(relation.tag_id) || null,
        });
    }

    return items.map(item => ({
        ...item,
        library_categories: item.category_id
            ? categoryMap.get(item.category_id) || null
            : null,
        library_item_tags: relationsByItem.get(item.id) || [],
    }));
}

/**
 * Crea un elemento de biblioteca y asocia tags.
 */
export async function createLibraryItem(userId, itemData, tagIds = []) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado' };

    try {
        const { data, error } = await supabase
            .from('library_items')
            .insert({ ...itemData, user_id: userId })
            .select()
            .single();

        if (error) return { success: false, error: error.message };

        /* Asociar tags */
        if (tagIds.length > 0 && data) {
            const rows = tagIds.map(tagId => ({
                user_id: userId,
                library_item_id: data.id,
                tag_id: tagId,
            }));
            await supabase.from('library_item_tags').insert(rows);
        }

        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Actualiza un elemento de biblioteca y reemplaza tags.
 */
export async function updateLibraryItem(userId, itemId, itemData, tagIds = null) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado' };

    try {
        const { data, error } = await supabase
            .from('library_items')
            .update({ ...itemData, updated_at: new Date().toISOString() })
            .eq('id', itemId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) return { success: false, error: error.message };

        /* Reemplazar tags si se proporcionan */
        if (tagIds !== null && data) {
            await supabase.from('library_item_tags').delete().eq('library_item_id', data.id).eq('user_id', userId);
            if (tagIds.length > 0) {
                const rows = tagIds.map(tagId => ({
                    user_id: userId,
                    library_item_id: data.id,
                    tag_id: tagId,
                }));
                await supabase.from('library_item_tags').insert(rows);
            }
        }

        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Elimina un elemento de biblioteca.
 */
export async function deleteLibraryItem(userId, itemId) {
    if (!userId || !supabase) return { success: false, error: 'No autenticado' };

    try {
        /* Eliminar tags asociados primero */
        await supabase.from('library_item_tags').delete().eq('library_item_id', itemId).eq('user_id', userId);

        const { error } = await supabase
            .from('library_items')
            .delete()
            .eq('id', itemId)
            .eq('user_id', userId);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

export async function togglePinStatus(userId, itemId, newState) {
    return updateLibraryItem(userId, itemId, { is_pinned: newState });
}

export { PAGE_SIZE };
