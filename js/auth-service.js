/* ============================================================
   DEVHUB — SERVICIO DE AUTENTICACIÓN
   ============================================================
   Capa de abstracción sobre Supabase Auth. Centraliza todas
   las operaciones de autenticación y normaliza los errores
   para nunca exponer mensajes técnicos al usuario final.
   ============================================================ */

import { supabase } from './supabase-client.js';
import { AUTH_CALLBACK_URL } from './config.js';

/**
 * Mensajes genéricos de error que no revelan información sensible.
 */
const ERROR_MESSAGES = {
    NOT_CONFIGURED: 'La aplicación no está configurada. Contacta al administrador.',
    INVALID_CREDENTIALS: 'Las credenciales no son correctas o la cuenta no está disponible.',
    SIGNUP_FAILED: 'No fue posible completar el registro. Verifica los datos e intenta de nuevo.',
    RECOVERY_FAILED: 'No se pudo enviar la solicitud de recuperación en este momento.',
    UPDATE_PASSWORD_FAILED: 'No fue posible actualizar la contraseña. Intenta de nuevo.',
    SIGNOUT_FAILED: 'Ocurrió un error al cerrar la sesión.',
    UNEXPECTED: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
};

/**
 * Verifica que el cliente Supabase esté disponible.
 * @returns {{ success: false, error: string } | null} - null si está disponible
 */
function guardClient() {
    if (!supabase) {
        return { success: false, error: ERROR_MESSAGES.NOT_CONFIGURED };
    }
    return null;
}

/**
 * Resultado normalizado de cada operación.
 * @typedef {{ success: boolean, data?: any, error?: string }} AuthResult
 */

/**
 * Inicia sesión con correo y contraseña.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthResult>}
 */
export async function signIn(email, password) {
    const guard = guardClient();
    if (guard) return guard;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: ERROR_MESSAGES.INVALID_CREDENTIALS };
        }

        return { success: true, data };
    } catch {
        return { success: false, error: ERROR_MESSAGES.UNEXPECTED };
    }
}

/**
 * Registra un nuevo usuario con metadata de perfil.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<AuthResult>}
 */
export async function signUp(email, password, displayName) {
    const guard = guardClient();
    if (guard) return guard;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                },
                emailRedirectTo: AUTH_CALLBACK_URL,
            },
        });

        if (error) {
            return { success: false, error: ERROR_MESSAGES.SIGNUP_FAILED };
        }

        /*
         * Si Supabase requiere confirmación de correo, data.session será null
         * pero data.user existirá. Indicamos que necesita confirmar.
         */
        const needsConfirmation = data.user && data.session === null;

        return {
            success: true,
            data,
            needsConfirmation,
        };
    } catch {
        return { success: false, error: ERROR_MESSAGES.UNEXPECTED };
    }
}

/**
 * Envía un correo de recuperación de contraseña.
 * Siempre devuelve éxito para no revelar si el email existe.
 * @param {string} email
 * @returns {Promise<AuthResult>}
 */
export async function recoverPassword(email) {
    const guard = guardClient();
    if (guard) return guard;

    try {
        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: AUTH_CALLBACK_URL,
        });

        /* Siempre reportamos éxito para proteger la privacidad */
        return { success: true };
    } catch {
        return { success: false, error: ERROR_MESSAGES.RECOVERY_FAILED };
    }
}

/**
 * Actualiza la contraseña del usuario autenticado.
 * @param {string} newPassword
 * @returns {Promise<AuthResult>}
 */
export async function updatePassword(newPassword) {
    const guard = guardClient();
    if (guard) return guard;

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return { success: false, error: ERROR_MESSAGES.UPDATE_PASSWORD_FAILED };
        }

        return { success: true };
    } catch {
        return { success: false, error: ERROR_MESSAGES.UNEXPECTED };
    }
}

/**
 * Cierra la sesión actual.
 * @returns {Promise<AuthResult>}
 */
export async function signOut() {
    const guard = guardClient();
    if (guard) return guard;

    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error en signOut:', error.message);
            return { success: false, error: ERROR_MESSAGES.SIGNOUT_FAILED };
        }

        return { success: true };
    } catch {
        return { success: false, error: ERROR_MESSAGES.UNEXPECTED };
    }
}

/**
 * Obtiene la sesión actual si existe.
 * @returns {Promise<{ session: object|null }>}
 */
export async function getSession() {
    if (!supabase) return { session: null };

    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.warn('Error al obtener sesión:', error.message);
            return { session: null };
        }

        return { session };
    } catch {
        return { session: null };
    }
}

/**
 * Registra un listener para cambios de estado de autenticación.
 * Devuelve el objeto de suscripción para poder desuscribirse si es necesario.
 * @param {function} callback - (event, session) => void
 * @returns {{ data: { subscription: object } }}
 */
export function onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
}
