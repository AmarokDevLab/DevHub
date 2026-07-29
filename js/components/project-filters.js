/* ============================================================
   DEVHUB — FILTROS DE PROYECTOS
   ============================================================ */

let changeHandler = () => {};
let elements = {};

function updateActiveCount() {
    const filters = getProjectFilters();
    const count = Object.values(filters).filter(value => value && value !== 'active').length;
    const badge = elements.countBadge;
    if (badge) {
        badge.textContent = count ? String(count) : '';
        badge.style.display = count ? 'inline-flex' : 'none';
    }
    if (elements.clearButton) elements.clearButton.style.display = count ? 'inline-flex' : 'none';
}

function notify() {
    updateActiveCount();
    changeHandler();
}

export function initProjectFilters({ onChange, technologies = [] } = {}) {
    changeHandler = typeof onChange === 'function' ? onChange : () => {};
    elements = {
        status: document.getElementById('filter-project-status'),
        type: document.getElementById('filter-project-type'),
        technology: document.getElementById('filter-project-technology'),
        pinned: document.getElementById('filter-project-pinned'),
        startFrom: document.getElementById('filter-project-start-from'),
        startTo: document.getElementById('filter-project-start-to'),
        sort: document.getElementById('project-sort'),
        clearButton: document.getElementById('project-clear-filters'),
        countBadge: document.getElementById('project-filter-count'),
    };

    updateTechnologyFilter(technologies);
    restoreFiltersFromUrl();

    [elements.status, elements.type, elements.technology, elements.pinned, elements.startFrom, elements.startTo, elements.sort]
        .filter(Boolean)
        .forEach(control => control.addEventListener('change', notify));

    elements.clearButton?.addEventListener('click', () => {
        clearProjectFilters();
        notify();
    });

    updateActiveCount();
}

export function updateTechnologyFilter(technologies = []) {
    const select = elements.technology || document.getElementById('filter-project-technology');
    if (!select) return;
    const selected = select.value;
    while (select.options.length > 1) select.remove(1);
    technologies.forEach(technology => {
        const option = document.createElement('option');
        option.value = technology.id;
        option.textContent = technology.name;
        select.appendChild(option);
    });
    select.value = selected;
}

export function getProjectFilters() {
    return {
        status: elements.status?.value || '',
        projectType: elements.type?.value || '',
        technologyId: elements.technology?.value || '',
        isPinned: Boolean(elements.pinned?.checked),
        startFrom: elements.startFrom?.value || '',
        startTo: elements.startTo?.value || '',
    };
}

export function getProjectSort() {
    return elements.sort?.value || 'updated_desc';
}

export function clearProjectFilters() {
    if (elements.status) elements.status.value = '';
    if (elements.type) elements.type.value = '';
    if (elements.technology) elements.technology.value = '';
    if (elements.pinned) elements.pinned.checked = false;
    if (elements.startFrom) elements.startFrom.value = '';
    if (elements.startTo) elements.startTo.value = '';
    if (elements.sort) elements.sort.value = 'updated_desc';
    updateActiveCount();
}

export function persistFiltersToUrl(search = '', page = 0, view = 'grid') {
    const url = new URL(window.location.href);
    const filters = getProjectFilters();
    const values = {
        q: search.trim(),
        status: filters.status,
        type: filters.projectType,
        technology: filters.technologyId,
        pinned: filters.isPinned ? '1' : '',
        start_from: filters.startFrom,
        start_to: filters.startTo,
        sort: getProjectSort() !== 'updated_desc' ? getProjectSort() : '',
        page: page > 0 ? String(page + 1) : '',
        view: view !== 'grid' ? view : '',
    };

    Object.entries(values).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
    });
    history.replaceState(null, '', url);
}

export function restoreFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (elements.status) elements.status.value = params.get('status') || '';
    if (elements.type) elements.type.value = params.get('type') || '';
    if (elements.technology) elements.technology.value = params.get('technology') || '';
    if (elements.pinned) elements.pinned.checked = params.get('pinned') === '1';
    if (elements.startFrom) elements.startFrom.value = params.get('start_from') || '';
    if (elements.startTo) elements.startTo.value = params.get('start_to') || '';
    if (elements.sort) elements.sort.value = params.get('sort') || 'updated_desc';
}
