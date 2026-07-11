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
