/* ============================================================
   DEVHUB — VALIDADORES DE FORMULARIO
   ============================================================
   Funciones puras de validación reutilizables en cualquier
   formulario de la aplicación.
   ============================================================ */

/**
 * Valida formato de correo electrónico.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Verifica cada requisito de contraseña por separado.
 * Devuelve un objeto con el estado de cada regla.
 * @param {string} password
 * @returns {{ minLength: boolean, hasLetter: boolean, hasNumber: boolean }}
 */
export function getPasswordStrength(password) {
    return {
        minLength: password.length >= 8,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /\d/.test(password),
    };
}

/**
 * Valida que la contraseña cumpla TODOS los requisitos.
 * @param {string} password
 * @returns {boolean}
 */
export function validatePasswordStrength(password) {
    const strength = getPasswordStrength(password);
    return strength.minLength && strength.hasLetter && strength.hasNumber;
}

/**
 * Valida el nombre visible del perfil.
 * @param {string} name
 * @returns {boolean}
 */
export function validateDisplayName(name) {
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 80;
}

/**
 * Valida si una URL tiene un formato correcto (http/https).
 * @param {string} url
 * @returns {boolean}
 */
export function validateUrl(url) {
    if (!url) return false;
    const pattern = /^https?:\/\//i;
    if (!pattern.test(url)) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Valida un archivo de imagen (tipo MIME y tamaño máximo en MB).
 * @param {File} file
 * @param {number} maxSizeMB
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file, maxSizeMB = 5) {
    if (!file) return { valid: false, error: 'No se proporcionó un archivo.' };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Formato de imagen no permitido. Usa JPEG, PNG, WebP o GIF.' };
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { valid: false, error: `El archivo excede el tamaño máximo de ${maxSizeMB} MB.` };
    }

    return { valid: true };
}

/**
 * Normaliza una cadena para uso como nombre o etiqueta.
 * @param {string} str
 * @returns {string}
 */
export function normalizeString(str) {
    if (!str) return '';
    return str.trim().toLowerCase();
}
