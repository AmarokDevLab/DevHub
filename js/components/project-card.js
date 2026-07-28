/* ============================================================
   DEVHUB — TARJETA DE PROYECTO
   ============================================================ */

export const PROJECT_STATUS_LABELS = Object.freeze({
    planning: 'Planeación',
    active: 'Activo',
    paused: 'Pausado',
    testing: 'En pruebas',
    completed: 'Completado',
    cancelled: 'Cancelado',
    archived: 'Archivado',
});

export const PROJECT_TYPE_LABELS = Object.freeze({
    personal: 'Personal',
    client: 'De cliente',
    internal: 'Interno',
    experimental: 'Experimental',
    educational: 'Educativo',
    product: 'Producto propio',
});

const ICON_PATHS = Object.freeze({
    code: '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>',
    api: '<path d="M7 7h10v10H7z"/><path d="M3 9h4M17 9h4M3 15h4M17 15h4M9 3v4M15 3v4M9 17v4M15 17v4"/>',
    mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
    package: '<path d="M12 3l8 4-8 4-8-4 8-4zM4 7v10l8 4 8-4V7M12 11v10"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    layers: '<path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18"/>',
    rocket: '<path d="M14 4c3-2 6-1 6-1s1 3-1 6l-6 6-4-4 5-7zM9 11l-4 1-2 2 5 1M13 15l-1 4-2 2-1-5"/><circle cx="16" cy="7" r="1"/>',
    book: '<path d="M4 5a3 3 0 013-3h5v18H7a3 3 0 00-3 3V5zM20 5a3 3 0 00-3-3h-5v18h5a3 3 0 013 3V5z"/>',
});

function svgIcon(name, size = 22) {
    const wrapper = document.createElement('span');
    wrapper.className = 'project-icon-svg';
    wrapper.setAttribute('aria-hidden', 'true');
    const path = ICON_PATHS[name] || ICON_PATHS.code;
    wrapper.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    return wrapper;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function button(className, label, content) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.setAttribute('aria-label', label);
    if (typeof content === 'string') node.textContent = content;
    else if (content) node.appendChild(content);
    return node;
}

function formatDate(value, fallback = 'Sin fecha') {
    if (!value) return fallback;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatUpdated(value) {
    if (!value) return 'Sin actualización';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin actualización';
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function addMenuItem(menu, label, handler, { danger = false, hidden = false } = {}) {
    if (hidden) return;
    const item = button(`project-card__menu-item${danger ? ' project-card__menu-item--danger' : ''}`, label, label);
    item.setAttribute('role', 'menuitem');
    item.addEventListener('click', event => {
        event.stopPropagation();
        menu.hidden = true;
        handler?.();
    });
    menu.appendChild(item);
}

export function createProjectCard(project, handlers = {}) {
    const card = el('article', 'project-card');
    card.dataset.projectId = project.id;
    card.style.setProperty('--project-color', project.color || '#7C6FF2');

    const accent = el('div', 'project-card__accent');
    card.appendChild(accent);

    const body = el('div', 'project-card__body');
    card.appendChild(body);

    const header = el('div', 'project-card__header');
    body.appendChild(header);

    const identity = el('div', 'project-card__identity');
    const icon = el('div', 'project-card__icon');
    icon.appendChild(svgIcon(project.icon));
    identity.appendChild(icon);

    const heading = el('div', 'project-card__heading');
    const title = el('h3', 'project-card__title', project.name);
    heading.appendChild(title);
    if (project.client_name) heading.appendChild(el('div', 'project-card__client', project.client_name));
    identity.appendChild(heading);
    header.appendChild(identity);

    const actionGroup = el('div', 'project-card__top-actions');
    const star = button(
        `project-card__pin${project.is_pinned ? ' project-card__pin--active' : ''}`,
        project.is_pinned ? 'Quitar de favoritos' : 'Agregar a favoritos',
        project.is_pinned ? '★' : '☆'
    );
    star.setAttribute('aria-pressed', String(Boolean(project.is_pinned)));
    star.addEventListener('click', event => {
        event.stopPropagation();
        handlers.onTogglePinned?.(project.id, Boolean(project.is_pinned));
    });
    actionGroup.appendChild(star);

    const menuWrapper = el('div', 'project-card__menu-wrapper');
    const menuButton = button('project-card__menu-button', 'Abrir menú de acciones', '•••');
    menuButton.setAttribute('aria-haspopup', 'menu');
    menuButton.setAttribute('aria-expanded', 'false');
    const menu = el('div', 'project-card__menu');
    menu.hidden = true;
    menu.setAttribute('role', 'menu');

    addMenuItem(menu, 'Abrir proyecto', () => handlers.onOpen?.(project.id));
    addMenuItem(menu, 'Editar', () => handlers.onEdit?.(project.id));
    addMenuItem(menu, project.is_archived ? 'Restaurar' : 'Archivar', () => handlers.onArchive?.(project.id, !project.is_archived));
    addMenuItem(menu, 'Abrir repositorio', () => handlers.onOpenUrl?.(project.repository_url), { hidden: !project.repository_url });
    addMenuItem(menu, 'Abrir producción', () => handlers.onOpenUrl?.(project.production_url), { hidden: !project.production_url });
    addMenuItem(menu, 'Abrir pruebas', () => handlers.onOpenUrl?.(project.testing_url), { hidden: !project.testing_url });
    addMenuItem(menu, 'Copiar enlace', () => handlers.onCopyUrl?.(project), {
        hidden: !project.production_url && !project.testing_url && !project.repository_url && !project.domain,
    });
    addMenuItem(menu, 'Eliminar', () => handlers.onDelete?.(project.id, project.name), { danger: true });

    menuButton.addEventListener('click', event => {
        event.stopPropagation();
        const willOpen = menu.hidden;
        document.querySelectorAll('.project-card__menu:not([hidden])').forEach(other => {
            if (other !== menu) other.hidden = true;
        });
        menu.hidden = !willOpen;
        menuButton.setAttribute('aria-expanded', String(willOpen));
    });

    menuWrapper.append(menuButton, menu);
    actionGroup.appendChild(menuWrapper);
    header.appendChild(actionGroup);

    const badges = el('div', 'project-card__badges');
    const status = el('span', `project-status project-status--${project.status}`, PROJECT_STATUS_LABELS[project.status] || project.status);
    badges.appendChild(status);
    badges.appendChild(el('span', 'project-type', PROJECT_TYPE_LABELS[project.project_type] || project.project_type));
    if (project.is_archived) badges.appendChild(el('span', 'project-archived-badge', 'Archivado'));
    body.appendChild(badges);

    const description = el('p', 'project-card__description', project.description || 'Sin descripción.');
    body.appendChild(description);

    const technologies = el('div', 'project-card__technologies');
    const visibleTechnologies = (project.technologies || []).slice(0, 3);
    visibleTechnologies.forEach(technology => {
        const chip = el('span', 'project-tech-chip', technology.name);
        if (technology.color) chip.style.setProperty('--technology-color', technology.color);
        technologies.appendChild(chip);
    });
    const remaining = (project.technologies || []).length - visibleTechnologies.length;
    if (remaining > 0) technologies.appendChild(el('span', 'project-tech-chip project-tech-chip--more', `+${remaining}`));
    if (!visibleTechnologies.length) technologies.appendChild(el('span', 'project-tech-chip project-tech-chip--empty', 'Sin tecnologías'));
    body.appendChild(technologies);

    const meta = el('div', 'project-card__meta');
    const startMeta = el('div', 'project-card__meta-item');
    startMeta.append(el('span', 'project-card__meta-label', 'Inicio'), el('span', '', formatDate(project.start_date)));
    const updateMeta = el('div', 'project-card__meta-item project-card__meta-item--end');
    updateMeta.append(el('span', 'project-card__meta-label', 'Actualizado'), el('span', '', formatUpdated(project.updated_at)));
    meta.append(startMeta, updateMeta);
    body.appendChild(meta);

    const footer = el('div', 'project-card__footer');
    const quickLinks = el('div', 'project-card__quick-links');

    const quickLink = (label, url, path) => {
        if (!url) return;
        const link = document.createElement('a');
        link.className = 'project-card__quick-link';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', label);
        link.addEventListener('click', event => event.stopPropagation());
        const iconNode = el('span');
        iconNode.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
        link.appendChild(iconNode);
        quickLinks.appendChild(link);
    };

    quickLink('Abrir repositorio', project.repository_url, '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3"/>');
    quickLink('Abrir producción', project.production_url, '<path d="M14 3h7v7M10 14L21 3M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>');
    quickLink('Abrir pruebas', project.testing_url, '<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3M8 15h8"/>');

    footer.appendChild(quickLinks);
    const openButton = button('project-card__open', `Abrir ${project.name}`, 'Abrir proyecto');
    openButton.addEventListener('click', event => {
        event.stopPropagation();
        handlers.onOpen?.(project.id);
    });
    footer.appendChild(openButton);
    body.appendChild(footer);

    card.addEventListener('keydown', event => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
            event.preventDefault();
            handlers.onOpen?.(project.id);
        }
    });

    return card;
}

export function createProjectSkeleton() {
    const card = el('article', 'project-card project-card--skeleton');
    card.innerHTML = `
        <div class="project-card__accent"></div>
        <div class="project-card__body">
            <div class="project-skeleton project-skeleton--header"></div>
            <div class="project-skeleton project-skeleton--badge"></div>
            <div class="project-skeleton project-skeleton--line"></div>
            <div class="project-skeleton project-skeleton--line project-skeleton--short"></div>
            <div class="project-skeleton project-skeleton--chips"></div>
            <div class="project-skeleton project-skeleton--footer"></div>
        </div>`;
    return card;
}
