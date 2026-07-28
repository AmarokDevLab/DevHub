/* ============================================================
   DEVHUB — FORMULARIO DE PROYECTOS
   ============================================================ */

import { validateUrl } from '../validators.js';
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from './project-card.js';

let callbacks = {};
let technologies = [];
let selectedTechnologyIds = new Set();
let editingProjectId = null;
let quickMode = false;
let lastFocusedElement = null;

const ICON_OPTIONS = [
    ['code', 'Código'], ['globe', 'Sitio web'], ['api', 'API'], ['mobile', 'Móvil'],
    ['database', 'Base de datos'], ['server', 'Servidor'], ['package', 'Producto'],
    ['terminal', 'Terminal'], ['layers', 'Plataforma'], ['briefcase', 'Cliente'],
    ['rocket', 'Experimental'], ['book', 'Educativo'],
];

function getElements() {
    return {
        drawer: document.getElementById('project-form-drawer'),
        overlay: document.getElementById('project-form-overlay'),
        form: document.getElementById('project-form'),
        title: document.getElementById('project-form-title'),
        close: document.getElementById('project-form-close'),
        cancel: document.getElementById('project-form-cancel'),
        submit: document.getElementById('project-form-submit'),
        submitText: document.getElementById('project-form-submit-text'),
        submitSpinner: document.getElementById('project-form-submit-spinner'),
        name: document.getElementById('project-name'),
        client: document.getElementById('project-client'),
        description: document.getElementById('project-description'),
        type: document.getElementById('project-type'),
        status: document.getElementById('project-status'),
        color: document.getElementById('project-color'),
        colorText: document.getElementById('project-color-text'),
        icon: document.getElementById('project-icon'),
        startDate: document.getElementById('project-start-date'),
        endDate: document.getElementById('project-end-date'),
        repository: document.getElementById('project-repository-url'),
        production: document.getElementById('project-production-url'),
        testing: document.getElementById('project-testing-url'),
        domain: document.getElementById('project-domain'),
        pinned: document.getElementById('project-is-pinned'),
        archived: document.getElementById('project-is-archived'),
        technologySearch: document.getElementById('project-technology-search'),
        technologyList: document.getElementById('project-technology-list'),
        selectedTechnologies: document.getElementById('project-selected-technologies'),
        newTechnologyName: document.getElementById('new-technology-name'),
        newTechnologyColor: document.getElementById('new-technology-color'),
        addTechnology: document.getElementById('add-technology-btn'),
        technologyMessage: document.getElementById('technology-message'),
        advancedSections: document.querySelectorAll('[data-project-advanced]'),
        descriptionCount: document.getElementById('project-description-count'),
        errorSummary: document.getElementById('project-form-errors'),
    };
}

function setInvalid(input, message = '') {
    if (!input) return;
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    const feedback = input.closest('.project-form-field')?.querySelector('.invalid-feedback');
    if (feedback && message) feedback.textContent = message;
}

function clearInvalid(input) {
    if (!input) return;
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
}

function isHexColor(value) {
    return /^#[0-9A-Fa-f]{6}$/.test(String(value || ''));
}

function isSafeIcon(value) {
    return /^[a-z0-9][a-z0-9_-]{0,49}$/.test(String(value || ''));
}

function normalizeOptionalUrl(value) {
    const clean = String(value || '').trim();
    return clean || null;
}

export function normalizeDomain(value) {
    const clean = String(value || '').trim();
    if (!clean) return null;
    try {
        const withProtocol = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
        const parsed = new URL(withProtocol);
        return parsed.host.toLowerCase();
    } catch {
        return clean
            .replace(/^https?:\/\//i, '')
            .split('/')[0]
            .trim()
            .toLowerCase();
    }
}

function validate(elements) {
    const errors = [];
    [
        elements.name, elements.client, elements.description, elements.colorText, elements.icon,
        elements.startDate, elements.endDate, elements.repository, elements.production,
        elements.testing, elements.domain,
    ].forEach(clearInvalid);

    const name = elements.name.value.trim();
    if (!name || name.length > 150) {
        setInvalid(elements.name, 'El nombre es obligatorio y admite hasta 150 caracteres.');
        errors.push('Revisa el nombre del proyecto.');
    }

    const client = elements.client.value.trim();
    if (client.length > 150) {
        setInvalid(elements.client, 'El cliente admite hasta 150 caracteres.');
        errors.push('Revisa el nombre del cliente.');
    }

    if (elements.description.value.length > 3000) {
        setInvalid(elements.description, 'La descripción admite hasta 3000 caracteres.');
        errors.push('La descripción es demasiado larga.');
    }

    if (!isHexColor(elements.colorText.value)) {
        setInvalid(elements.colorText, 'Utiliza un color hexadecimal #RRGGBB.');
        errors.push('El color no tiene un formato válido.');
    }

    if (!isSafeIcon(elements.icon.value)) {
        setInvalid(elements.icon, 'Selecciona un identificador de icono válido.');
        errors.push('El icono no es válido.');
    }

    if (elements.startDate.value && elements.endDate.value && elements.endDate.value < elements.startDate.value) {
        setInvalid(elements.endDate, 'La fecha final no puede ser anterior a la fecha de inicio.');
        errors.push('Las fechas no son coherentes.');
    }

    [elements.repository, elements.production, elements.testing].forEach(input => {
        const value = input.value.trim();
        if (value && !validateUrl(value)) {
            setInvalid(input, 'La URL debe comenzar con http:// o https://.');
            errors.push(`Revisa ${input.labels?.[0]?.textContent || 'una URL'}.`);
        }
    });

    const domain = normalizeDomain(elements.domain.value);
    if (domain && (domain.length > 255 || /\s/.test(domain) || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(domain))) {
        setInvalid(elements.domain, 'Ingresa un dominio o host válido, por ejemplo devhub.app o localhost:5500.');
        errors.push('El dominio no es válido.');
    }

    elements.errorSummary.textContent = errors.join(' ');
    elements.errorSummary.hidden = errors.length === 0;

    return errors.length === 0;
}

function buildPayload(elements) {
    const status = elements.status.value;
    const archived = elements.archived.checked || status === 'archived';
    return {
        name: elements.name.value.trim(),
        client_name: elements.client.value.trim() || null,
        description: elements.description.value.trim() || null,
        project_type: elements.type.value,
        status,
        start_date: elements.startDate.value || null,
        end_date: elements.endDate.value || null,
        repository_url: normalizeOptionalUrl(elements.repository.value),
        production_url: normalizeOptionalUrl(elements.production.value),
        testing_url: normalizeOptionalUrl(elements.testing.value),
        domain: normalizeDomain(elements.domain.value),
        color: elements.colorText.value.toUpperCase(),
        icon: elements.icon.value,
        is_pinned: elements.pinned.checked,
        is_archived: archived,
    };
}

function renderTechnologyList(filter = '') {
    const elements = getElements();
    if (!elements.technologyList) return;
    elements.technologyList.textContent = '';
    const term = String(filter || '').trim().toLowerCase();
    const filtered = technologies.filter(item => !term || item.name.toLowerCase().includes(term));

    if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'project-technology-empty';
        empty.textContent = 'No hay tecnologías que coincidan.';
        elements.technologyList.appendChild(empty);
        return;
    }

    filtered.forEach(technology => {
        const label = document.createElement('label');
        label.className = 'project-technology-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = technology.id;
        checkbox.checked = selectedTechnologyIds.has(technology.id);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selectedTechnologyIds.add(technology.id);
            else selectedTechnologyIds.delete(technology.id);
            renderSelectedTechnologies();
        });

        const dot = document.createElement('span');
        dot.className = 'project-technology-option__dot';
        dot.style.backgroundColor = technology.color || '#7C6FF2';

        const text = document.createElement('span');
        text.textContent = technology.name;
        label.append(checkbox, dot, text);
        elements.technologyList.appendChild(label);
    });
}

function renderSelectedTechnologies() {
    const elements = getElements();
    elements.selectedTechnologies.textContent = '';

    const selected = technologies.filter(item => selectedTechnologyIds.has(item.id));
    if (!selected.length) {
        const text = document.createElement('span');
        text.className = 'project-selected-technologies__empty';
        text.textContent = 'Sin tecnologías seleccionadas';
        elements.selectedTechnologies.appendChild(text);
        return;
    }

    selected.forEach(technology => {
        const chip = document.createElement('span');
        chip.className = 'project-selected-technology';
        chip.textContent = technology.name;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.setAttribute('aria-label', `Quitar ${technology.name}`);
        remove.textContent = '×';
        remove.addEventListener('click', () => {
            selectedTechnologyIds.delete(technology.id);
            renderTechnologyList(getElements().technologySearch.value);
            renderSelectedTechnologies();
        });
        chip.appendChild(remove);
        elements.selectedTechnologies.appendChild(chip);
    });
}

function populateStaticOptions() {
    const elements = getElements();
    if (elements.status && elements.status.options.length === 0) {
        Object.entries(PROJECT_STATUS_LABELS).forEach(([value, label]) => {
            const option = new Option(label, value);
            elements.status.add(option);
        });
    }
    if (elements.type && elements.type.options.length === 0) {
        Object.entries(PROJECT_TYPE_LABELS).forEach(([value, label]) => {
            elements.type.add(new Option(label, value));
        });
    }
    if (elements.icon && elements.icon.options.length === 0) {
        ICON_OPTIONS.forEach(([value, label]) => elements.icon.add(new Option(label, value)));
    }
}

function syncColor(source) {
    const elements = getElements();
    const value = source === 'picker' ? elements.color.value : elements.colorText.value;
    if (isHexColor(value)) {
        elements.color.value = value;
        elements.colorText.value = value.toUpperCase();
        clearInvalid(elements.colorText);
    }
}

function setBusy(busy) {
    const elements = getElements();
    elements.submit.disabled = busy;
    elements.cancel.disabled = busy;
    elements.close.disabled = busy;
    elements.submitSpinner.classList.toggle('d-none', !busy);
    elements.submitText.textContent = busy
        ? (editingProjectId ? 'Actualizando...' : 'Creando...')
        : (editingProjectId ? 'Guardar cambios' : 'Crear proyecto');
}

function setQuickMode(enabled) {
    quickMode = enabled;
    const elements = getElements();
    elements.advancedSections.forEach(section => section.hidden = enabled);
    elements.title.textContent = enabled ? 'Creación rápida' : (editingProjectId ? 'Editar proyecto' : 'Nuevo proyecto');
}

function openDrawer() {
    const elements = getElements();
    lastFocusedElement = document.activeElement;
    elements.overlay.classList.add('project-overlay--visible');
    elements.drawer.classList.add('project-drawer--open');
    elements.drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('project-drawer-open');
    setTimeout(() => elements.name.focus(), 100);
}

export function closeProjectForm() {
    const elements = getElements();
    elements.overlay.classList.remove('project-overlay--visible');
    elements.drawer.classList.remove('project-drawer--open');
    elements.drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('project-drawer-open');
    lastFocusedElement?.focus?.();
}

function resetForm() {
    const elements = getElements();
    elements.form.reset();
    editingProjectId = null;
    selectedTechnologyIds = new Set();
    elements.status.value = 'planning';
    elements.type.value = 'personal';
    elements.color.value = '#7C6FF2';
    elements.colorText.value = '#7C6FF2';
    elements.icon.value = 'code';
    elements.errorSummary.hidden = true;
    elements.errorSummary.textContent = '';
    elements.descriptionCount.textContent = '0 / 3000';
    elements.technologySearch.value = '';
    renderTechnologyList();
    renderSelectedTechnologies();
    [
        elements.name, elements.client, elements.description, elements.colorText, elements.icon,
        elements.startDate, elements.endDate, elements.repository, elements.production,
        elements.testing, elements.domain,
    ].forEach(clearInvalid);
}

export function openProjectCreate() {
    resetForm();
    setQuickMode(false);
    getElements().title.textContent = 'Nuevo proyecto';
    openDrawer();
}

export function openProjectQuickCreate() {
    resetForm();
    setQuickMode(true);
    openDrawer();
}

export function openProjectEdit(project) {
    resetForm();
    editingProjectId = project.id;
    setQuickMode(false);
    const elements = getElements();
    elements.title.textContent = 'Editar proyecto';
    elements.name.value = project.name || '';
    elements.client.value = project.client_name || '';
    elements.description.value = project.description || '';
    elements.type.value = project.project_type || 'personal';
    elements.status.value = project.status || 'planning';
    elements.color.value = project.color || '#7C6FF2';
    elements.colorText.value = (project.color || '#7C6FF2').toUpperCase();
    elements.icon.value = project.icon || 'code';
    elements.startDate.value = project.start_date || '';
    elements.endDate.value = project.end_date || '';
    elements.repository.value = project.repository_url || '';
    elements.production.value = project.production_url || '';
    elements.testing.value = project.testing_url || '';
    elements.domain.value = project.domain || '';
    elements.pinned.checked = Boolean(project.is_pinned);
    elements.archived.checked = Boolean(project.is_archived);
    selectedTechnologyIds = new Set((project.technologies || []).map(item => item.id));
    elements.descriptionCount.textContent = `${elements.description.value.length} / 3000`;
    renderTechnologyList();
    renderSelectedTechnologies();
    openDrawer();
}

export function updateProjectFormTechnologies(items = []) {
    technologies = [...items].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    renderTechnologyList(getElements().technologySearch?.value || '');
    renderSelectedTechnologies();
}

export function initProjectForm({ onSave, onCreateTechnology, technologies: initialTechnologies = [] } = {}) {
    callbacks = { onSave, onCreateTechnology };
    technologies = initialTechnologies;
    populateStaticOptions();
    const elements = getElements();

    elements.close.addEventListener('click', closeProjectForm);
    elements.cancel.addEventListener('click', closeProjectForm);
    elements.overlay.addEventListener('click', closeProjectForm);
    elements.color.addEventListener('input', () => syncColor('picker'));
    elements.colorText.addEventListener('input', () => syncColor('text'));
    elements.description.addEventListener('input', () => {
        elements.descriptionCount.textContent = `${elements.description.value.length} / 3000`;
    });
    elements.technologySearch.addEventListener('input', () => renderTechnologyList(elements.technologySearch.value));
    elements.status.addEventListener('change', () => {
        if (elements.status.value === 'archived') elements.archived.checked = true;
    });

    elements.addTechnology.addEventListener('click', async () => {
        const name = elements.newTechnologyName.value.trim();
        if (!name) {
            elements.technologyMessage.textContent = 'Escribe el nombre de la tecnología.';
            return;
        }
        elements.addTechnology.disabled = true;
        elements.technologyMessage.textContent = 'Creando tecnología...';
        const result = await callbacks.onCreateTechnology?.({
            name,
            color: elements.newTechnologyColor.value || null,
        });
        elements.addTechnology.disabled = false;
        if (!result?.success) {
            elements.technologyMessage.textContent = result?.error || 'No se pudo crear la tecnología.';
            return;
        }
        elements.newTechnologyName.value = '';
        elements.technologyMessage.textContent = result.existed ? 'La tecnología ya existía y fue seleccionada.' : 'Tecnología creada y seleccionada.';
        selectedTechnologyIds.add(result.data.id);
        updateProjectFormTechnologies(result.technologies || [...technologies, result.data]);
    });

    elements.form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validate(elements)) {
            elements.errorSummary.focus?.();
            return;
        }
        setBusy(true);
        try {
            const project = buildPayload(elements);
            if (quickMode) {
                project.client_name = null;
                project.description = null;
                project.project_type = 'personal';
                project.start_date = null;
                project.end_date = null;
                project.repository_url = null;
                project.production_url = null;
                project.testing_url = null;
                project.domain = null;
                project.icon = 'code';
                project.is_pinned = false;
                project.is_archived = false;
            }
            const result = await callbacks.onSave?.({
                mode: editingProjectId ? 'edit' : 'create',
                projectId: editingProjectId,
                project,
                technologyIds: quickMode ? [] : [...selectedTechnologyIds],
            });
            if (result?.success) closeProjectForm();
            else {
                elements.errorSummary.hidden = false;
                elements.errorSummary.textContent = result?.error || 'No fue posible guardar el proyecto.';
            }
        } finally {
            setBusy(false);
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && elements.drawer.classList.contains('project-drawer--open')) closeProjectForm();
    });

    updateProjectFormTechnologies(initialTechnologies);
}
