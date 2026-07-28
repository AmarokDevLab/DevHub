/* ============================================================
   DEVHUB — UI DEL MÓDULO DE AUTENTICACIÓN
   ============================================================
   Gestiona toda la manipulación del DOM para las vistas de
   autenticación: navegación entre formularios, alertas,
   indicadores de contraseña y toggles de visibilidad.
   
   SEGURIDAD: No se usa innerHTML con datos del usuario.
   ============================================================ */

import { getPasswordStrength } from './validators.js';

/* ---- CONSTANTES DE VISTAS ---- */

export const VIEWS = {
    LOGIN: 'login-view',
    SIGNUP: 'signup-view',
    RECOVER: 'recover-view',
    RESET: 'reset-view',
    CONFIRM_SENT: 'confirm-sent-view',
};

const ALL_VIEW_IDS = [
    VIEWS.LOGIN,
    VIEWS.SIGNUP,
    VIEWS.RECOVER,
    VIEWS.RESET,
    VIEWS.CONFIRM_SENT,
];

/* ---- REFERENCIAS AL DOM (se inicializan en init) ---- */

let alertContainer = null;
let globalLoader = null;
let authContainer = null;

/**
 * Inicializa las referencias al DOM.
 * Debe llamarse una vez al cargar la página.
 */
export function initUI() {
    alertContainer = document.getElementById('alert-container');
    globalLoader = document.getElementById('global-loader');
    authContainer = document.getElementById('auth-container');

    initPasswordToggles();
    initPasswordIndicators();
}

/* ---- GESTIÓN DE VISTAS ---- */

/**
 * Muestra una vista y oculta las demás dentro del contenedor auth.
 * @param {string} targetViewId - Uno de los valores de VIEWS
 */
export function showView(targetViewId) {
    clearAlerts();

    authContainer.classList.remove('d-none');

    ALL_VIEW_IDS.forEach((id) => {
        const viewEl = document.getElementById(id);
        if (!viewEl) return;

        if (id === targetViewId) {
            viewEl.classList.remove('d-none');
            viewEl.classList.add('fade-in-view');

            /* Focalizar el primer input o, si no existe, el primer botón */
            const focusTarget =
                viewEl.querySelector('input:not([type="hidden"])') ||
                viewEl.querySelector('button');
            if (focusTarget) {
                setTimeout(() => focusTarget.focus(), 100);
            }
        } else {
            viewEl.classList.add('d-none');
            viewEl.classList.remove('fade-in-view');
        }
    });
}

/* ---- ALERTAS ACCESIBLES ---- */

/**
 * Crea un icono SVG para las alertas sin usar innerHTML con datos de usuario.
 * @param {'danger'|'success'} type
 * @returns {SVGElement}
 */
function createAlertIcon(type) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    if (type === 'danger') {
        path.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z');
    } else {
        path.setAttribute('d', 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z');
    }

    svg.appendChild(path);
    return svg;
}

/**
 * Muestra una alerta accesible en el contenedor de notificaciones.
 * Usa createElement/textContent para prevenir XSS.
 * @param {string} message
 * @param {'danger'|'success'} type
 */
export function showAlert(message, type = 'danger') {
    clearAlerts();

    const alertDiv = document.createElement('div');
    alertDiv.className = `clay-alert clay-alert-${type}`;
    alertDiv.setAttribute('role', 'alert');

    const contentDiv = document.createElement('div');
    contentDiv.className = 'd-flex align-items-center gap-2';

    contentDiv.appendChild(createAlertIcon(type));

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    contentDiv.appendChild(textSpan);

    alertDiv.appendChild(contentDiv);
    alertContainer.appendChild(alertDiv);

    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Limpia todas las alertas del contenedor.
 */
export function clearAlerts() {
    if (alertContainer) {
        alertContainer.textContent = '';
    }
}

/* ---- ESTADO DE CARGA EN BOTONES ---- */

/**
 * Activa o desactiva el estado de carga de un formulario.
 * @param {string} formId
 * @param {boolean} isLoading
 */
export function toggleBtnLoading(formId, isLoading) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;

    const spinner = btn.querySelector('.spinner-border');

    if (isLoading) {
        btn.disabled = true;
        if (spinner) spinner.classList.remove('d-none');
    } else {
        btn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
}

/**
 * Activa o desactiva el estado de carga de un botón individual.
 * @param {string} btnId
 * @param {boolean} isLoading
 */
export function toggleButtonLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const spinner = btn.querySelector('.spinner-border');

    if (isLoading) {
        btn.disabled = true;
        if (spinner) spinner.classList.remove('d-none');
    } else {
        btn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
}

/* ---- LOADER GLOBAL ---- */

/**
 * Oculta el loader global con una transición suave.
 */
export function hideLoader() {
    if (globalLoader) {
        setTimeout(() => {
            globalLoader.style.opacity = '0';
            globalLoader.style.visibility = 'hidden';
        }, 300);
    }
}

/**
 * Muestra el loader global.
 */
export function showLoader() {
    if (globalLoader) {
        globalLoader.style.opacity = '1';
        globalLoader.style.visibility = 'visible';
    }
}

/* ---- TOGGLE DE VISIBILIDAD DE CONTRASEÑA ---- */

/** SVG path del icono "ojo abierto" (contraseña oculta) */
const EYE_OPEN_PATHS = [
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
];

/** SVG path del icono "ojo cerrado" (contraseña visible) */
const EYE_CLOSED_PATH = 'M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88';

/**
 * Crea un SVG de ojo para el toggle de contraseña.
 * @param {boolean} isVisible - true = ojo cerrado (contraseña visible)
 * @returns {SVGElement}
 */
function createEyeSVG(isVisible) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    if (isVisible) {
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('d', EYE_CLOSED_PATH);
        svg.appendChild(path);
    } else {
        EYE_OPEN_PATHS.forEach((d) => {
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('d', d);
            svg.appendChild(path);
        });
    }

    return svg;
}

/**
 * Inicializa todos los botones toggle de contraseña en la página.
 */
function initPasswordToggles() {
    document.querySelectorAll('.pwd-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            /* Actualizar aria-pressed y aria-label */
            button.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
            button.setAttribute(
                'aria-label',
                isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            );

            /* Reemplazar el icono SVG */
            button.textContent = '';
            button.appendChild(createEyeSVG(isPassword));
        });
    });
}

/* ---- INDICADORES DINÁMICOS DE REQUISITOS DE CONTRASEÑA ---- */

/**
 * Inicializa los indicadores de requisitos de contraseña en formularios
 * que contengan un elemento con clase .password-requirements.
 */
function initPasswordIndicators() {
    const passwordInputs = document.querySelectorAll('[data-password-requirements]');

    passwordInputs.forEach((input) => {
        const requirementsId = input.getAttribute('data-password-requirements');
        const requirementsList = document.getElementById(requirementsId);
        if (!requirementsList) return;

        input.addEventListener('input', () => {
            const strength = getPasswordStrength(input.value);

            const minLengthItem = requirementsList.querySelector('[data-req="minLength"]');
            const hasLetterItem = requirementsList.querySelector('[data-req="hasLetter"]');
            const hasNumberItem = requirementsList.querySelector('[data-req="hasNumber"]');

            if (minLengthItem) minLengthItem.classList.toggle('met', strength.minLength);
            if (hasLetterItem) hasLetterItem.classList.toggle('met', strength.hasLetter);
            if (hasNumberItem) hasNumberItem.classList.toggle('met', strength.hasNumber);
        });
    });
}
