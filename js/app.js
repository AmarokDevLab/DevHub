/* ============================================================
   DEVHUB — PUNTO DE ENTRADA (index.html)
   ============================================================
   Inicializa la aplicación de autenticación:
   1. Verifica configuración de Supabase.
   2. Comprueba si existe una sesión activa → redirige al dashboard.
   3. Registra onAuthStateChange (una sola vez).
   4. Conecta los formularios con el servicio de autenticación.
   5. Gestiona la navegación entre vistas.
   ============================================================ */

import { isPlaceholderConfig, DASHBOARD_URL } from './config.js';
import {
    signIn,
    signUp,
    recoverPassword,
    updatePassword,
    signOut,
    getSession,
    onAuthStateChange,
} from './auth-service.js';
import {
    validateEmail,
    validatePasswordStrength,
    validateDisplayName,
} from './validators.js';
import {
    VIEWS,
    initUI,
    showView,
    showAlert,
    clearAlerts,
    toggleBtnLoading,
    hideLoader,
    showLoader,
} from './auth-ui.js';

/* ---- INICIALIZACIÓN ---- */

/** Flag para evitar doble procesamiento de sesión */
let hasProcessedInitialSession = false;

document.addEventListener('DOMContentLoaded', async () => {
    initUI();

    /* Mostrar banner si las credenciales no están configuradas */
    if (isPlaceholderConfig()) {
        const banner = document.getElementById('config-banner');
        if (banner) banner.style.display = 'block';
    }

    /* Verificar sesión existente */
    const { session } = await getSession();

    if (session) {
        /*
         * Si hay un token de recovery en la URL, no redirigir al dashboard.
         * El evento PASSWORD_RECOVERY lo manejará onAuthStateChange.
         */
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            hasProcessedInitialSession = true;
            hideLoader();
            /* onAuthStateChange procesará el evento PASSWORD_RECOVERY */
        } else {
            /* Sesión activa sin recovery: ir al dashboard */
            window.location.href = DASHBOARD_URL;
            return;
        }
    } else {
        hasProcessedInitialSession = true;
        showView(VIEWS.LOGIN);
        hideLoader();
    }

    /* Registrar listener de cambios de autenticación (una sola vez) */
    onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            showView(VIEWS.RESET);
            hideLoader();
            cleanUrlHash();
            return;
        }

        if (event === 'SIGNED_IN' && session) {
            /* Redirigir al dashboard después de un login exitoso */
            window.location.href = DASHBOARD_URL;
            return;
        }

        if (event === 'SIGNED_OUT') {
            showView(VIEWS.LOGIN);
            hideLoader();
        }
    });

    /* Conectar navegación y formularios */
    bindNavigation();
    bindLoginForm();
    bindSignupForm();
    bindRecoverForm();
    bindResetForm();
});

/* ---- LIMPIEZA DE URL ---- */

/**
 * Elimina parámetros sensibles del hash de la URL.
 */
function cleanUrlHash() {
    if (window.location.hash) {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
}

/* ---- NAVEGACIÓN ENTRE VISTAS ---- */

function bindNavigation() {
    const nav = {
        'goto-signup': VIEWS.SIGNUP,
        'goto-login': VIEWS.LOGIN,
        'goto-recover': VIEWS.RECOVER,
        'goto-login-from-recover': VIEWS.LOGIN,
        'goto-login-from-sent': VIEWS.LOGIN,
    };

    Object.entries(nav).forEach(([id, view]) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showView(view);
            });
        }
    });
}

/* ---- FORMULARIO DE LOGIN ---- */

function bindLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        /* Validaciones de cliente */
        if (!email || !password) {
            showAlert('Por favor, ingresa todos los campos obligatorios.');
            return;
        }

        if (!validateEmail(email)) {
            showAlert('El formato del correo electrónico ingresado no es válido.');
            return;
        }

        if (password.length < 6) {
            showAlert('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        try {
            toggleBtnLoading('login-form', true);
            clearAlerts();

            const result = await signIn(email, password);

            if (!result.success) {
                showAlert(result.error);
            }
            /*
             * Si el login es exitoso, onAuthStateChange recibirá SIGNED_IN
             * y redirigirá automáticamente al dashboard.
             */
        } finally {
            toggleBtnLoading('login-form', false);
        }
    });
}

/* ---- FORMULARIO DE REGISTRO ---- */

function bindSignupForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const displayName = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const termsAccepted = document.getElementById('signup-terms').checked;

        if (!displayName || !email || !password || !confirmPassword) {
            showAlert('Todos los campos son obligatorios para el registro.');
            return;
        }

        if (!validateDisplayName(displayName)) {
            showAlert('El nombre visible debe tener entre 2 y 80 caracteres.');
            return;
        }

        if (!validateEmail(email)) {
            showAlert('El formato de correo provisto es incorrecto.');
            return;
        }

        if (!validatePasswordStrength(password)) {
            showAlert('La contraseña no cumple con los requisitos mínimos de seguridad.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Las contraseñas ingresadas no coinciden.');
            return;
        }

        if (!termsAccepted) {
            showAlert('Debes aceptar los términos y condiciones para continuar.');
            return;
        }

        try {
            toggleBtnLoading('signup-form', true);
            clearAlerts();

            const result = await signUp(email, password, displayName);

            if (!result.success) {
                showAlert(result.error);
                return;
            }

            if (result.needsConfirmation) {
                showView(VIEWS.CONFIRM_SENT);
            } else {
                showAlert('¡Cuenta creada con éxito! Redirigiendo...', 'success');
                /* onAuthStateChange gestionará la redirección */
            }
        } finally {
            toggleBtnLoading('signup-form', false);
        }
    });
}

/* ---- FORMULARIO DE RECUPERACIÓN ---- */

function bindRecoverForm() {
    const form = document.getElementById('recover-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('recover-email').value.trim();

        if (!email) {
            showAlert('Por favor, indica tu dirección de correo electrónico.');
            return;
        }

        if (!validateEmail(email)) {
            showAlert('El formato del correo electrónico ingresado no es válido.');
            return;
        }

        try {
            toggleBtnLoading('recover-form', true);
            clearAlerts();

            await recoverPassword(email);

            /* Siempre mostramos mensaje neutro, sin importar si el email existe */
            showAlert(
                'Si existe una cuenta asociada, recibirás instrucciones para restablecer tu contraseña.',
                'success'
            );

            document.getElementById('recover-email').value = '';
        } finally {
            toggleBtnLoading('recover-form', false);
        }
    });
}

/* ---- FORMULARIO DE RESET DE CONTRASEÑA ---- */

function bindResetForm() {
    const form = document.getElementById('reset-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('reset-password').value;
        const confirmPassword = document.getElementById('reset-confirm-password').value;

        if (!password || !confirmPassword) {
            showAlert('Todos los campos son de llenado obligatorio.');
            return;
        }

        if (!validatePasswordStrength(password)) {
            showAlert('La contraseña debe contar con al menos 8 caracteres, letras y números.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Las contraseñas no coinciden.');
            return;
        }

        try {
            toggleBtnLoading('reset-form', true);
            clearAlerts();

            const result = await updatePassword(password);

            if (!result.success) {
                showAlert(result.error);
                return;
            }

            showAlert('¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...', 'success');

            /* Cerrar sesión por seguridad y redirigir al login */
            setTimeout(async () => {
                await signOut();
                cleanUrlHash();
                showView(VIEWS.LOGIN);
            }, 2000);
        } finally {
            toggleBtnLoading('reset-form', false);
        }
    });
}
