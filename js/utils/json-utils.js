/* ============================================================
   DEVHUB — UTILIDADES JSON
   ============================================================
   Validación, formateo y helpers para el campo json_content
   que se almacena como jsonb en PostgreSQL.
   ============================================================ */

/**
 * Valida una cadena JSON.
 * @param {string} str - Cadena a validar.
 * @returns {{ valid: boolean, parsed?: any, error?: string, line?: number }}
 */
export function validateJSON(str) {
    if (!str || !str.trim()) {
        return { valid: true, parsed: null };
    }

    try {
        const parsed = JSON.parse(str);
        return { valid: true, parsed };
    } catch (err) {
        const result = { valid: false, error: err.message };

        /* Intentar extraer número de línea del mensaje de error */
        const posMatch = err.message.match(/position\s+(\d+)/i);
        if (posMatch) {
            const position = parseInt(posMatch[1], 10);
            const line = str.substring(0, position).split('\n').length;
            result.line = line;
        }

        return result;
    }
}

/**
 * Formatea una cadena JSON con indentación estándar.
 * @param {string} str - Cadena JSON a formatear.
 * @returns {{ success: boolean, formatted?: string, error?: string }}
 */
export function formatJSON(str) {
    if (!str || !str.trim()) {
        return { success: true, formatted: '' };
    }

    try {
        const parsed = JSON.parse(str);
        const formatted = JSON.stringify(parsed, null, 2);
        return { success: true, formatted };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Determina si la cadena está vacía o es un JSON vacío.
 * Retorna true si debe enviarse como null a la BD.
 * @param {string} str
 * @returns {boolean}
 */
export function isEmptyJSON(str) {
    if (!str || !str.trim()) return true;

    try {
        const parsed = JSON.parse(str);
        if (parsed === null || parsed === undefined) return true;
        if (typeof parsed === 'object' && Object.keys(parsed).length === 0) return true;
        if (Array.isArray(parsed) && parsed.length === 0) return true;
        return false;
    } catch {
        /* Si no es JSON válido, no es "vacío" (tiene contenido inválido) */
        return false;
    }
}

/**
 * Prepara el valor JSON para enviar a Supabase.
 * Retorna el objeto parseado o null.
 * @param {string} str
 * @returns {object|null}
 */
export function prepareJSONForDB(str) {
    if (!str || !str.trim()) return null;

    try {
        const parsed = JSON.parse(str);
        if (parsed === null || parsed === undefined) return null;
        return parsed;
    } catch {
        return null;
    }
}
