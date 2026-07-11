/* ============================================================
   DEVHUB — COMPONENTE: FILTROS DE PROMPTS
   ============================================================
   Barra de filtros con soporte responsive: inline en desktop,
   offcanvas en móvil. Combina búsqueda FTS con filtros.
   ============================================================ */

import { PROMPT_TYPES, SORT_OPTIONS } from '../services/prompts-service.js';

/* ---- ESTADO DE FILTROS ---- */

let currentFilters = {};
let onFilterChange = null;

export function initFilters({ onChange, categories = [], tags = [] }) {
    onFilterChange = onChange;
    currentFilters = {};

    populateSelect('filter-type', PROMPT_TYPES.map((t) => ({ value: t.value, label: t.label })));
    populateSelect('filter-category', categories.map((c) => ({ value: c.id, label: c.name })));
    populateSelect('filter-tag', tags.map((t) => ({ value: t.id, label: t.name })));
    populateSelect('filter-sort', SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label })));

    bindFilterEvents();
}

/**
 * Actualiza las opciones de categorías y etiquetas.
 */
export function updateFilterOptions({ categories = [], tags = [] }) {
    populateSelect('filter-category', categories.map((c) => ({ value: c.id, label: c.name })));
    populateSelect('filter-tag', tags.map((t) => ({ value: t.id, label: t.name })));
}

/**
 * Retorna los filtros activos actuales.
 * @returns {object}
 */
export function getActiveFilters() {
    return { ...currentFilters };
}

/**
 * Retorna el ordenamiento actual.
 * @returns {string}
 */
export function getActiveSort() {
    const el = document.getElementById('filter-sort');
    return el ? el.value : 'updated_desc';
}

/**
 * Limpia todos los filtros.
 */
export function clearAllFilters() {
    currentFilters = {};

    const selects = ['filter-type', 'filter-category', 'filter-tag', 'filter-sort'];
    selects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = id === 'filter-sort' ? 'updated_desc' : '';
    });

    });

    const checkboxes = ['filter-favorite', 'filter-has-reference', 'filter-has-result', 'filter-has-json'];
    checkboxes.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });

    const dateInputs = ['filter-date-from', 'filter-date-to'];
    dateInputs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    updateActiveCount();
    if (onFilterChange) onFilterChange();
}

/**
 * Retorna la cantidad de filtros activos.
 * @returns {number}
 */
export function getActiveFilterCount() {
    return Object.keys(currentFilters).length;
}

/* ---- INTERNOS ---- */

function bindFilterEvents() {
    /* Selects */
    const selects = ['filter-type', 'filter-category', 'filter-tag'];
    selects.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                collectFilters();
                if (onFilterChange) onFilterChange();
            });
        }
    });

    /* Sort */
    const sortEl = document.getElementById('filter-sort');
    if (sortEl) {
        sortEl.addEventListener('change', () => {
            if (onFilterChange) onFilterChange();
        });
    }


    /* Checkboxes */
    const checks = ['filter-favorite', 'filter-has-reference', 'filter-has-result', 'filter-has-json'];
    checks.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                collectFilters();
                if (onFilterChange) onFilterChange();
            });
        }
    });

    /* Fechas */
    const dates = ['filter-date-from', 'filter-date-to'];
    dates.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                collectFilters();
                if (onFilterChange) onFilterChange();
            });
        }
    });

    /* Limpiar filtros */
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

function collectFilters() {
    currentFilters = {};

    const type = document.getElementById('filter-type')?.value;
    if (type) currentFilters.type = type;

    const category = document.getElementById('filter-category')?.value;
    if (category) currentFilters.categoryId = category;

    const tag = document.getElementById('filter-tag')?.value;
    if (tag) currentFilters.tagId = tag;

    const favorite = document.getElementById('filter-favorite')?.checked;
    if (favorite) currentFilters.favorite = true;

    const hasRef = document.getElementById('filter-has-reference')?.checked;
    if (hasRef) currentFilters.hasReference = true;

    const hasResult = document.getElementById('filter-has-result')?.checked;
    if (hasResult) currentFilters.hasResult = true;

    const hasJSON = document.getElementById('filter-has-json')?.checked;
    if (hasJSON) currentFilters.hasJSON = true;

    const dateFrom = document.getElementById('filter-date-from')?.value;
    if (dateFrom) currentFilters.dateFrom = dateFrom;

    const dateTo = document.getElementById('filter-date-to')?.value;
    if (dateTo) currentFilters.dateTo = dateTo;

    updateActiveCount();
}

function updateActiveCount() {
    const count = Object.keys(currentFilters).length;
    const badge = document.getElementById('filter-count-badge');
    if (badge) {
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;

    /* Preservar la primera opción (placeholder) */
    const firstOpt = select.querySelector('option:first-child');
    select.textContent = '';
    if (firstOpt) select.appendChild(firstOpt);

    options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
}

function populateDatalist(id, values) {
    const datalist = document.getElementById(id);
    if (!datalist) return;

    datalist.textContent = '';
    values.forEach((val) => {
        const option = document.createElement('option');
        option.value = val;
        datalist.appendChild(option);
    });
}
