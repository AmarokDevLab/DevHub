/* ============================================================
   DEVHUB — VIEWPORT MÓVIL COMPARTIDO
   ------------------------------------------------------------
   Mantiene una altura útil estable para drawers y paneles cuando
   cambia la barra del navegador, aparece el teclado o rota el equipo.
   No bloquea el scroll del documento.
   ============================================================ */

let initialized = false;
let scheduledFrame = 0;

function getViewportMetrics() {
    const viewport = window.visualViewport;
    const height = Math.max(
        1,
        Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight || 1)
    );
    const width = Math.max(
        1,
        Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth || 1)
    );
    const offsetTop = Math.max(0, Math.round(viewport?.offsetTop || 0));

    return { height, width, offsetTop };
}

function applyViewportVariables() {
    scheduledFrame = 0;

    const { height, width, offsetTop } = getViewportMetrics();
    const root = document.documentElement;

    root.style.setProperty('--app-viewport-height', `${height}px`);
    root.style.setProperty('--app-viewport-width', `${width}px`);
    root.style.setProperty('--app-viewport-offset-top', `${offsetTop}px`);
    root.style.setProperty('--app-vh', `${height * 0.01}px`);
}

function scheduleViewportUpdate() {
    if (scheduledFrame) window.cancelAnimationFrame(scheduledFrame);
    scheduledFrame = window.requestAnimationFrame(applyViewportVariables);
}

export function refreshMobileViewport() {
    scheduleViewportUpdate();
}

export function initMobileViewport() {
    if (initialized) {
        scheduleViewportUpdate();
        return;
    }

    initialized = true;
    applyViewportVariables();

    window.addEventListener('resize', scheduleViewportUpdate, { passive: true });
    window.addEventListener('orientationchange', scheduleViewportUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleViewportUpdate, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) scheduleViewportUpdate();
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleViewportUpdate, { passive: true });
        window.visualViewport.addEventListener('scroll', scheduleViewportUpdate, { passive: true });
    }
}
