/* ============================================================
   DEVHUB — RESUMEN DE MÓDULOS RELACIONADOS
   ============================================================ */

import { supabase } from '../supabase-client.js';
import { getSession } from '../auth-service.js';

async function requireSession() {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
    const { session } = await getSession();
    if (!session?.user) throw new Error('SESSION_EXPIRED');
    return session;
}

export async function getLibrarySummary(projectId, limit = 5) {
    try {
        await requireSession();
        const { data, error, count } = await supabase
            .from('library_items')
            .select('id,title,resource_type,url,updated_at', { count: 'exact' })
            .eq('project_id', projectId)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[DevHub][ProjectSummary][Library]', error);
            return { success: false, error: 'No se pudo consultar la Biblioteca relacionada.' };
        }

        return { success: true, data: data || [], count: count || 0 };
    } catch (error) {
        console.error('[DevHub][ProjectSummary]', error);
        return { success: false, error: 'No se pudo consultar el resumen del proyecto.' };
    }
}

export async function getProjectModuleSummary(projectId) {
    const library = await getLibrarySummary(projectId);

    return {
        success: library.success,
        data: {
            diary: { count: 0, unit: 'entradas', available: false },
            roadmap: { count: 0, unit: 'elementos', available: false },
            ideas: { count: 0, unit: 'ideas', available: false },
            prompts: { count: 0, unit: 'prompts', available: false },
            devvault: { count: 0, unit: 'fragmentos', available: false },
            library: {
                count: library.success ? library.count : 0,
                unit: 'elementos',
                available: library.success,
                items: library.success ? library.data : [],
            },
            files: { count: 0, unit: 'archivos', available: false },
        },
        error: library.success ? null : library.error,
    };
}
