/* ============================================================
   DEVHUB — SERVICIO DE PROYECTOS
   ============================================================ */

import { supabase } from '../supabase-client.js';
import { getSession } from '../auth-service.js';
import {
    loadTechnologiesForProjects,
    replaceProjectTechnologies,
} from './technology-service.js';

export const PROJECT_PAGE_SIZE = 24;

function fail(error, fallback = 'No fue posible completar la operación con proyectos.') {
    console.error('[DevHub][Projects]', error);
    return { success: false, error: fallback, code: error?.code || null };
}

async function requireUser() {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
    const { session } = await getSession();
    if (!session?.user) throw new Error('SESSION_EXPIRED');
    return session.user;
}

/**
 * Lista ligera para selectores de otros módulos (Biblioteca, Prompts, etc.).
 * Incluye proyectos archivados para no perder relaciones históricas.
 */
export async function listProjectOptions() {
    try {
        const user = await requireUser();
        const { data, error } = await supabase
            .from('projects')
            .select('id, name, color, icon, status, is_archived')
            .eq('user_id', user.id)
            .order('is_archived', { ascending: true })
            .order('name', { ascending: true });

        if (error) return fail(error, 'No se pudieron cargar las opciones de proyectos.');
        return { success: true, data: data || [] };
    } catch (error) {
        return fail(error, 'No se pudieron cargar las opciones de proyectos.');
    }
}

function cleanSearchTerm(value) {
    return String(value || '')
        .trim()
        .replace(/[,%()]/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 120);
}

function applyOrdering(query, sort) {
    const options = {
        created_desc: ['created_at', false],
        created_asc: ['created_at', true],
        updated_desc: ['updated_at', false],
        name_asc: ['name', true],
        name_desc: ['name', false],
        start_desc: ['start_date', false],
    };

    if (sort === 'pinned_first') {
        return query
            .order('is_pinned', { ascending: false })
            .order('updated_at', { ascending: false });
    }

    const [column, ascending] = options[sort] || options.updated_desc;
    return query.order(column, { ascending, nullsFirst: false });
}

async function getProjectIdsByTechnology(technologyId) {
    if (!technologyId) return null;
    const { data, error } = await supabase
        .from('project_technologies')
        .select('project_id')
        .eq('technology_id', technologyId);

    if (error) throw error;
    return [...new Set((data || []).map(item => item.project_id))];
}

export async function listProjects({
    search = '',
    filters = {},
    sort = 'updated_desc',
    page = 0,
    pageSize = PROJECT_PAGE_SIZE,
} = {}) {
    try {
        const user = await requireUser();
        const projectIds = await getProjectIdsByTechnology(filters.technologyId);

        if (Array.isArray(projectIds) && projectIds.length === 0) {
            return { success: true, data: [], total: 0, page, pageSize };
        }

        let query = supabase
            .from('projects')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id);

        if (Array.isArray(projectIds)) query = query.in('id', projectIds);

        const term = cleanSearchTerm(search);
        if (term) {
            const pattern = `%${term}%`;
            query = query.or([
                `name.ilike.${pattern}`,
                `client_name.ilike.${pattern}`,
                `description.ilike.${pattern}`,
                `domain.ilike.${pattern}`,
                `repository_url.ilike.${pattern}`,
                `production_url.ilike.${pattern}`,
                `testing_url.ilike.${pattern}`,
            ].join(','));
        }

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.projectType) query = query.eq('project_type', filters.projectType);
        if (filters.isPinned) query = query.eq('is_pinned', true);
        if (filters.startFrom) query = query.gte('start_date', filters.startFrom);
        if (filters.startTo) query = query.lte('start_date', filters.startTo);

        if (filters.archived === 'only') query = query.eq('is_archived', true);
        else if (filters.archived !== 'all') query = query.eq('is_archived', false);

        query = applyOrdering(query, sort);

        const safePage = Math.max(0, Number(page) || 0);
        const safeSize = Math.min(100, Math.max(1, Number(pageSize) || PROJECT_PAGE_SIZE));
        const from = safePage * safeSize;
        const to = from + safeSize - 1;

        const { data, error, count } = await query.range(from, to);
        if (error) return fail(error, 'No se pudieron cargar los proyectos.');

        const projects = data || [];
        const relations = await loadTechnologiesForProjects(projects.map(project => project.id));
        const technologyMap = relations.success ? relations.data : new Map();

        return {
            success: true,
            data: projects.map(project => ({
                ...project,
                technologies: technologyMap.get(project.id) || [],
            })),
            total: count || 0,
            page: safePage,
            pageSize: safeSize,
        };
    } catch (error) {
        return fail(error, error?.message === 'SESSION_EXPIRED'
            ? 'Tu sesión expiró. Inicia sesión nuevamente.'
            : 'No se pudieron cargar los proyectos.');
    }
}

export async function getProjectStats() {
    try {
        const user = await requireUser();
        const [totalResponse, activeResponse] = await Promise.all([
            supabase
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_archived', false),
            supabase
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'active')
                .eq('is_archived', false),
        ]);

        if (totalResponse.error) return fail(totalResponse.error, 'No se pudo calcular el resumen de proyectos.');
        if (activeResponse.error) return fail(activeResponse.error, 'No se pudo calcular el resumen de proyectos.');

        return {
            success: true,
            data: {
                total: totalResponse.count || 0,
                active: activeResponse.count || 0,
            },
        };
    } catch (error) {
        return fail(error, 'No se pudo calcular el resumen de proyectos.');
    }
}

export async function getProject(projectId) {
    try {
        const user = await requireUser();
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) return fail(error, 'No se pudo cargar el proyecto.');
        if (!data) return { success: false, error: 'Proyecto no encontrado.', code: 'NOT_FOUND' };

        const relations = await loadTechnologiesForProjects([projectId]);
        return {
            success: true,
            data: {
                ...data,
                technologies: relations.success ? relations.data.get(projectId) || [] : [],
            },
        };
    } catch (error) {
        return fail(error, 'No se pudo cargar el proyecto.');
    }
}

export async function createProject(project, technologyIds = []) {
    try {
        const user = await requireUser();
        const payload = { ...project, user_id: user.id };

        const { data, error } = await supabase
            .from('projects')
            .insert(payload)
            .select('*')
            .single();

        if (error) return fail(error, 'No se pudo crear el proyecto.');

        const relationResult = await replaceProjectTechnologies(data.id, technologyIds);
        if (!relationResult.success) {
            await supabase.from('projects').delete().eq('id', data.id).eq('user_id', user.id);
            return relationResult;
        }

        return { success: true, data };
    } catch (error) {
        return fail(error, 'No se pudo crear el proyecto.');
    }
}

export async function updateProject(projectId, project, technologyIds = []) {
    try {
        const user = await requireUser();
        const payload = { ...project };
        delete payload.id;
        delete payload.user_id;
        delete payload.created_at;
        delete payload.updated_at;
        delete payload.technologies;

        const { data, error } = await supabase
            .from('projects')
            .update(payload)
            .eq('id', projectId)
            .eq('user_id', user.id)
            .select('*')
            .single();

        if (error) return fail(error, 'No se pudo actualizar el proyecto.');

        const relationResult = await replaceProjectTechnologies(projectId, technologyIds);
        if (!relationResult.success) return relationResult;
        return { success: true, data };
    } catch (error) {
        return fail(error, 'No se pudo actualizar el proyecto.');
    }
}

export async function toggleProjectPinned(projectId, currentValue) {
    return updateProjectField(projectId, { is_pinned: !currentValue }, 'No se pudo actualizar el destacado.');
}

export async function setProjectArchived(projectId, archived) {
    return updateProjectField(projectId, { is_archived: Boolean(archived) }, archived
        ? 'No se pudo archivar el proyecto.'
        : 'No se pudo restaurar el proyecto.');
}

async function updateProjectField(projectId, changes, errorMessage) {
    try {
        const user = await requireUser();
        const { data, error } = await supabase
            .from('projects')
            .update(changes)
            .eq('id', projectId)
            .eq('user_id', user.id)
            .select('*')
            .single();

        if (error) return fail(error, errorMessage);
        return { success: true, data };
    } catch (error) {
        return fail(error, errorMessage);
    }
}

export async function deleteProject(projectId) {
    try {
        const user = await requireUser();
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', user.id);

        if (error) return fail(error, 'No se pudo eliminar el proyecto.');
        return { success: true };
    } catch (error) {
        return fail(error, 'No se pudo eliminar el proyecto.');
    }
}
