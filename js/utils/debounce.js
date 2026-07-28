/* ============================================================
   DEVHUB — UTILIDAD DEBOUNCE
   ============================================================
   Retrasa la ejecución de una función hasta que pase un periodo
   sin nuevas invocaciones. Ideal para búsquedas en tiempo real.
   ============================================================ */

/**
 * Crea una versión "debounced" de la función proporcionada.
 * @param {Function} fn - Función a ejecutar tras el retraso.
 * @param {number}   [delay=350] - Milisegundos de espera.
 * @returns {Function} Función envuelta con debounce.
 */
export function debounce(fn, delay = 350) {
    let timerId = null;

    const debounced = (...args) => {
        if (timerId !== null) {
            clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
            timerId = null;
            fn(...args);
        }, delay);
    };

    /**
     * Cancela cualquier ejecución pendiente.
     */
    debounced.cancel = () => {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
    };

    return debounced;
}
