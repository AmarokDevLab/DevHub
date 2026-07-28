/* ============================================================
   DEVHUB — DETALLE DEL PROYECTO
   ============================================================ */

import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from './project-card.js';

let callbacks = {};
let currentProject = null;
let lastFocusedElement = null;

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function formatDate(value, includeTime = false) {
    if (!value) return 'Sin fecha';
    const date = includeTime ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-MX', includeTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function safeExternalLink(label, url) {
    const link = document.createElement('a');
    link.className = 'project-detail-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const labelNode = el('span', 'project-detail-link__label', label);
    const valueNode = el('span', 'project-detail-link__value', url);
    link.append(labelNode, valueNode, el('span', 'project-detail-link__arrow', '↗'));
    return link;
}

function renderLinks(project) {
    const container = document.getElementById('project-detail-links');
    container.textContent = '';
    const entries = [
        ['Repositorio Git', project.repository_url],
        ['Producción', project.production_url],
        ['Pruebas', project.testing_url],
        ['Dominio', project.domain ? `https://${project.domain}` : null],
    ].filter(([, value]) => value);

    if (!entries.length) {
        container.appendChild(el('p', 'project-detail-empty', 'Este proyecto todavía no tiene enlaces técnicos.'));
        return;
    }
    entries.forEach(([label, value]) => container.appendChild(safeExternalLink(label, value)));
}

function renderTechnologies(project) {
    const container = document.getElementById('project-detail-technologies');
    container.textContent = '';
    if (!project.technologies?.length) {
        container.appendChild(el('span', 'project-detail-empty-inline', 'Sin tecnologías registradas'));
        return;
    }
    project.technologies.forEach(technology => {
        const chip = el('span', 'project-tech-chip', technology.name);
        if (technology.color) chip.style.setProperty('--technology-color', technology.color);
        container.appendChild(chip);
    });
}

function renderLibraryItems(items = [], projectId) {
    const container = document.getElementById('project-library-items');
    const openLibrary = document.getElementById('project-open-library');
    openLibrary.href = `biblioteca.html?project=${encodeURIComponent(projectId)}`;
    container.textContent = '';
    if (!items.length) {
        container.appendChild(el('p', 'project-detail-empty', 'No hay recursos de Biblioteca asociados.'));
        return;
    }

    items.forEach(item => {
        const row = document.createElement('a');
        row.className = 'project-library-item';
        row.href = item.url;
        row.target = '_blank';
        row.rel = 'noopener noreferrer';
        row.append(
            el('span', 'project-library-item__type', item.resource_type || 'recurso'),
            el('span', 'project-library-item__title', item.title),
            el('span', 'project-library-item__arrow', '↗')
        );
        container.appendChild(row);
    });

}

function renderSummary(summary, projectId) {
    const modules = [
        ['diary', 'Diario', '📝'],
        ['roadmap', 'Roadmap', '🗺️'],
        ['ideas', 'Ideas', '💡'],
        ['prompts', 'Prompts', '🤖'],
        ['devvault', 'DevVault', '⌨️'],
        ['library', 'Biblioteca', '🔖'],
        ['files', 'Archivos', '📁'],
    ];
    const container = document.getElementById('project-module-summary');
    container.textContent = '';

    modules.forEach(([key, label, icon]) => {
        const info = summary?.[key] || { count: 0, unit: 'elementos', available: false };
        const card = el('article', `project-module-card${info.available ? ' project-module-card--available' : ''}`);
        card.append(
            el('span', 'project-module-card__icon', icon),
            el('span', 'project-module-card__name', label),
            el('strong', 'project-module-card__count', String(info.count || 0)),
            el('span', 'project-module-card__unit', info.unit || 'elementos')
        );
        if (!info.available) card.appendChild(el('span', 'project-module-card__status', 'Preparado'));
        container.appendChild(card);
    });

    renderLibraryItems(summary?.library?.items || [], projectId);
}

function setActionLabels(project) {
    const pin = document.getElementById('project-detail-pin');
    pin.textContent = project.is_pinned ? '★ Favorito' : '☆ Agregar a favoritos';
    pin.setAttribute('aria-pressed', String(Boolean(project.is_pinned)));
    pin.classList.toggle('project-detail-action--active', Boolean(project.is_pinned));

    const archive = document.getElementById('project-detail-archive');
    archive.textContent = project.is_archived ? 'Restaurar' : 'Archivar';
}

export function showProjectDetail(project, summary = {}) {
    currentProject = project;
    const drawer = document.getElementById('project-detail-drawer');
    const overlay = document.getElementById('project-detail-overlay');
    lastFocusedElement = document.activeElement;

    const hero = document.getElementById('project-detail-hero');
    hero.style.setProperty('--project-color', project.color || '#7C6FF2');
    document.getElementById('project-detail-name').textContent = project.name;
    document.getElementById('project-detail-client').textContent = project.client_name || 'Proyecto personal';
    document.getElementById('project-detail-description').textContent = project.description || 'Sin descripción.';
    document.getElementById('project-detail-status').textContent = PROJECT_STATUS_LABELS[project.status] || project.status;
    document.getElementById('project-detail-status').className = `project-status project-status--${project.status}`;
    document.getElementById('project-detail-type').textContent = PROJECT_TYPE_LABELS[project.project_type] || project.project_type;
    document.getElementById('project-detail-start').textContent = formatDate(project.start_date);
    document.getElementById('project-detail-end').textContent = formatDate(project.end_date);
    document.getElementById('project-detail-created').textContent = formatDate(project.created_at, true);
    document.getElementById('project-detail-updated').textContent = formatDate(project.updated_at, true);
    document.getElementById('project-detail-archived').hidden = !project.is_archived;

    renderTechnologies(project);
    renderLinks(project);
    renderSummary(summary, project.id);
    setActionLabels(project);

    overlay.classList.add('project-overlay--visible');
    drawer.classList.add('project-detail--open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('project-drawer-open');
    setTimeout(() => document.getElementById('project-detail-close').focus(), 100);
}

export function closeProjectDetail() {
    const drawer = document.getElementById('project-detail-drawer');
    const overlay = document.getElementById('project-detail-overlay');
    overlay.classList.remove('project-overlay--visible');
    drawer.classList.remove('project-detail--open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('project-drawer-open');
    currentProject = null;
    lastFocusedElement?.focus?.();
}

export function updateOpenProjectDetail(project, summary) {
    if (currentProject?.id === project.id) showProjectDetail(project, summary);
}

export function initProjectDetail({ onEdit, onTogglePinned, onArchive, onDelete } = {}) {
    callbacks = { onEdit, onTogglePinned, onArchive, onDelete };
    const close = document.getElementById('project-detail-close');
    const overlay = document.getElementById('project-detail-overlay');
    const edit = document.getElementById('project-detail-edit');
    const pin = document.getElementById('project-detail-pin');
    const archive = document.getElementById('project-detail-archive');
    const remove = document.getElementById('project-detail-delete');

    close.addEventListener('click', closeProjectDetail);
    overlay.addEventListener('click', closeProjectDetail);
    edit.addEventListener('click', () => currentProject && callbacks.onEdit?.(currentProject.id));
    pin.addEventListener('click', () => currentProject && callbacks.onTogglePinned?.(currentProject.id, currentProject.is_pinned));
    archive.addEventListener('click', () => currentProject && callbacks.onArchive?.(currentProject.id, !currentProject.is_archived));
    remove.addEventListener('click', () => currentProject && callbacks.onDelete?.(currentProject.id, currentProject.name));

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.getElementById('project-detail-drawer').classList.contains('project-detail--open')) {
            closeProjectDetail();
        }
    });
}
