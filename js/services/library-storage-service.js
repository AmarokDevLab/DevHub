/* ============================================================
   DEVHUB — SERVICIO DE STORAGE (IMÁGENES DE BIBLIOTECA)
   ============================================================ */

import { supabase } from '../supabase-client.js';

const BUCKET = 'library-previews';

/**
 * Sube una imagen de vista previa al storage.
 */
export async function uploadPreviewImage(userId, itemId, file) {
    if (!supabase) return { success: false, error: 'No configurado' };

    const ext = file.name.split('.').pop();
    const filePath = `${userId}/${itemId}/${Date.now()}.${ext}`;

    try {
        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
            });

        if (error) return { success: false, error: error.message };
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Obtiene una URL firmada temporal para una imagen almacenada.
 */
export async function getSignedUrl(storagePath, expiresIn = 3600) {
    if (!supabase || !storagePath) return { success: false, url: null };

    try {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(storagePath, expiresIn);

        if (error) return { success: false, url: null };
        return { success: true, url: data.signedUrl };
    } catch (e) {
        return { success: false, url: null };
    }
}

/**
 * Elimina una imagen del storage.
 */
export async function deletePreviewImage(storagePath) {
    if (!supabase || !storagePath) return { success: false };

    try {
        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([storagePath]);

        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
