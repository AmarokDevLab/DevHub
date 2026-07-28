import { supabase } from '../supabase-client.js';

export async function listShareRecipients() {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { data, error } = await supabase.rpc('list_prompt_share_recipients');
        if (error) {
            console.error('Error al cargar destinatarios:', error.message);
            return { success: false, error: 'No fue posible cargar los usuarios.' };
        }
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Excepción al cargar destinatarios:', error);
        return { success: false, error: 'Error inesperado.' };
    }
}

export async function sharePromptCopy(promptId, recipientId) {
    if (!supabase) return { success: false, error: 'Cliente no configurado.' };

    try {
        const { data, error } = await supabase.rpc('share_prompt_copy', {
            source_prompt_id: promptId,
            recipient_id: recipientId,
        });
        if (error) {
            console.error('Error al compartir prompt:', error.message);
            return { success: false, error: 'No fue posible compartir la copia.' };
        }
        return { success: true, data: { id: data } };
    } catch (error) {
        console.error('Excepción al compartir prompt:', error);
        return { success: false, error: 'Error inesperado.' };
    }
}
