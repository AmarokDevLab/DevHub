/* ============================================================
   DEVHUB — SERVICIO DE TECNOLOGÍAS
   ============================================================ */

import { supabase } from '../supabase-client.js';
import { getSession } from '../auth-service.js';

function fail(error, fallback = 'No fue posible completar la operación con tecnologías.') {
    console.error('[DevHub][Technologies]', error);
    return { success: false, error: fallback };
}

async function requireUser() {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
    const { session } = await getSession();
    if (!session?.user) throw new Error('SESSION_EXPIRED');
    return session.user;
}

export function normalizeTechnologyName(value) {
    return String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

export async function listTechnologies() {
    try {
        await requireUser();
        const { data, error } = await supabase
            .from('technologies')
            .select('id,name,normalized_name,color,icon,created_at,updated_at')
            .order('name', { ascending: true });

        if (error) return fail(error, 'No se pudieron cargar las tecnologías.');
        return { success: true, data: data || [] };
    } catch (error) {
        return fail(error, error?.message === 'SESSION_EXPIRED'
            ? 'Tu sesión expiró. Inicia sesión nuevamente.'
            : 'No se pudieron cargar las tecnologías.');
    }
}

export async function createTechnology({ name, color = null, icon = null }) {
    try {
        const user = await requireUser();
        const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
        const normalizedName = normalizeTechnologyName(cleanName);

        if (!cleanName || cleanName.length > 60) {
            return { success: false, error: 'La tecnología debe tener entre 1 y 60 caracteres.' };
        }

        const { data: existing, error: existingError } = await supabase
            .from('technologies')
            .select('id,name,normalized_name,color,icon')
            .eq('normalized_name', normalizedName)
            .maybeSingle();

        if (existingError) return fail(existingError);
        if (existing) return { success: true, data: existing, existed: true };

        const payload = {
            user_id: user.id,
            name: cleanName,
            normalized_name: normalizedName,
            color: color || null,
            icon: icon || null,
        };

        const { data, error } = await supabase
            .from('technologies')
            .insert(payload)
            .select('id,name,normalized_name,color,icon')
            .single();

        if (error?.code === '23505') {
            const retry = await supabase
                .from('technologies')
                .select('id,name,normalized_name,color,icon')
                .eq('normalized_name', normalizedName)
                .single();
            if (!retry.error) return { success: true, data: retry.data, existed: true };
        }

        if (error) return fail(error, 'No fue posible crear la tecnología.');
        return { success: true, data, existed: false };
    } catch (error) {
        return fail(error);
    }
}

export async function loadTechnologiesForProjects(projectIds = []) {
    const map = new Map();
    projectIds.forEach(id => map.set(id, []));
    if (!projectIds.length) return { success: true, data: map };

    try {
        await requireUser();

        const { data: links, error: linksError } = await supabase
            .from('project_technologies')
            .select('project_id,technology_id')
            .in('project_id', projectIds);

        if (linksError) return fail(linksError, 'No se pudieron cargar las tecnologías de los proyectos.');
        if (!links?.length) return { success: true, data: map };

        const technologyIds = [...new Set(links.map(link => link.technology_id))];
        const { data: technologies, error: technologiesError } = await supabase
            .from('technologies')
            .select('id,name,normalized_name,color,icon')
            .in('id', technologyIds)
            .order('name', { ascending: true });

        if (technologiesError) return fail(technologiesError, 'No se pudieron cargar las tecnologías de los proyectos.');

        const technologyById = new Map((technologies || []).map(item => [item.id, item]));
        links.forEach(link => {
            const technology = technologyById.get(link.technology_id);
            if (technology && map.has(link.project_id)) map.get(link.project_id).push(technology);
        });

        for (const projectTechnologies of map.values()) {
            projectTechnologies.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        }

        return { success: true, data: map };
    } catch (error) {
        return fail(error, 'No se pudieron cargar las tecnologías de los proyectos.');
    }
}

export async function replaceProjectTechnologies(projectId, technologyIds = []) {
    try {
        const user = await requireUser();
        const uniqueIds = [...new Set(technologyIds.filter(Boolean))];

        const { data: previousLinks, error: previousError } = await supabase
            .from('project_technologies')
            .select('technology_id')
            .eq('project_id', projectId);

        if (previousError) return fail(previousError, 'No se pudo preparar la actualización de tecnologías.');

        const { error: deleteError } = await supabase
            .from('project_technologies')
            .delete()
            .eq('project_id', projectId);

        if (deleteError) return fail(deleteError, 'No se pudieron reemplazar las tecnologías.');
        if (!uniqueIds.length) return { success: true, data: [] };

        const rows = uniqueIds.map(technologyId => ({
            user_id: user.id,
            project_id: projectId,
            technology_id: technologyId,
        }));

        const { data, error: insertError } = await supabase
            .from('project_technologies')
            .insert(rows)
            .select('technology_id');

        if (insertError) {
            const restoreRows = (previousLinks || []).map(link => ({
                user_id: user.id,
                project_id: projectId,
                technology_id: link.technology_id,
            }));
            if (restoreRows.length) {
                await supabase.from('project_technologies').insert(restoreRows);
            }
            return fail(insertError, 'No se pudieron asociar las tecnologías seleccionadas.');
        }

        return { success: true, data: data || [] };
    } catch (error) {
        return fail(error, 'No se pudieron reemplazar las tecnologías.');
    }
}
