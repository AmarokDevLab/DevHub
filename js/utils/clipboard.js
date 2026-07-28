/* ============================================================
   DEVHUB — UTILIDAD DE PORTAPAPELES
   ============================================================
   Copia texto al portapapeles de forma segura y muestra un
   toast de confirmación accesible.
   ============================================================ */

/**
 * Copia texto al portapapeles del navegador.
 * @param {string} text - Contenido a copiar.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function copyToClipboard(text) {
    if (!text) {
        return { success: false, error: 'No hay contenido para copiar.' };
    }

    try {
        await navigator.clipboard.writeText(text);
        showCopyToast('Copiado al portapapeles');
        return { success: true };
    } catch {
        /* Fallback para navegadores sin soporte de Clipboard API */
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showCopyToast('Copiado al portapapeles');
            return { success: true };
        } catch {
            return { success: false, error: 'No fue posible copiar al portapapeles.' };
        }
    }
}

/* ---- TOAST DE NOTIFICACIÓN ---- */

/** @type {number|null} */
let toastTimer = null;

/**
 * Muestra un toast efímero con un mensaje.
 * Reutiliza el contenedor #copy-toast si existe.
 * @param {string} message
 * @param {'success'|'error'} [type='success']
 */
export function showCopyToast(message, type = 'success') {
    let toast = document.getElementById('copy-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copy-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }

    /* Limpiar temporizador previo */
    if (toastTimer !== null) {
        clearTimeout(toastTimer);
    }

    toast.textContent = message;
    toast.className = 'copy-toast';
    toast.classList.add(type === 'error' ? 'copy-toast--error' : 'copy-toast--success');
    toast.classList.add('copy-toast--visible');

    toastTimer = setTimeout(() => {
        toast.classList.remove('copy-toast--visible');
        toastTimer = null;
    }, 2200);
}
