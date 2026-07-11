/* ============================================================
   DEVHUB — COMPONENTE: TARJETA DE PROMPT
   ============================================================
   Renderiza una tarjeta de prompt con estilo Claymorphism.
   Usa createElement/textContent para prevenir XSS.
   ============================================================ */

import { PROMPT_TYPES } from '../services/prompts-service.js';

/* ---- HELPERS ---- */

/**
 * Devuelve la etiqueta legible de un tipo de prompt.
 * @param {string} type
 * @returns {string}
 */
function getTypeLabel(type) {
    const found = PROMPT_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
}

/**
 * Formatea una fecha ISO a formato local corto.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return '';
    }
}

/**
 * Trunca texto a un máximo de caracteres.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max = 80) {
    if (!text) return '';
    return text.length > max ? text.substring(0, max) + '…' : text;
}

/* ---- RENDERIZADO ---- */

/**
 * Crea el elemento DOM de una tarjeta de prompt.
 *
 * @param {object} prompt     - Datos del prompt.
 * @param {Array}  categories - Categorías enlazadas.
 * @param {Array}  tags       - Etiquetas enlazadas.
 * @param {object} callbacks  - Funciones callback para acciones.
 * @returns {HTMLElement}
 */
export function createPromptCard(prompt, categories = [], tags = [], callbacks = {}) {
    const card = document.createElement('article');
    card.className = 'prompt-card';
    card.dataset.promptId = prompt.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `Prompt: ${prompt.title}`);

    /* ---- Imagen de referencia (si existe) ---- */
    if (prompt.reference_image_path) {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'prompt-card__image';

        const img = document.createElement('img');
        img.alt = `Referencia para ${prompt.title}`;
        img.loading = 'lazy';
        img.src = prompt.reference_image_path;
        
        img.onerror = () => {
            imgWrapper.remove();
        };

        imgWrapper.appendChild(img);
        card.appendChild(imgWrapper);
    }

    /* ---- Cuerpo de la tarjeta ---- */
    const body = document.createElement('div');
    body.className = 'prompt-card__body';

    /* Header: tipo badge + favorito */
    const header = document.createElement('div');
    header.className = 'prompt-card__header';

    const typeBadge = document.createElement('span');
    typeBadge.className = `prompt-type-badge prompt-type-badge--${prompt.prompt_type}`;
    typeBadge.textContent = getTypeLabel(prompt.prompt_type);
    header.appendChild(typeBadge);

    /* Botón favorito */
    const favBtn = document.createElement('button');
    favBtn.className = 'prompt-card__fav-btn';
    favBtn.type = 'button';
    favBtn.setAttribute('aria-label', prompt.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos');
    favBtn.setAttribute('aria-pressed', prompt.is_favorite ? 'true' : 'false');
    favBtn.textContent = prompt.is_favorite ? '★' : '☆';
    if (prompt.is_favorite) favBtn.classList.add('prompt-card__fav-btn--active');

    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (callbacks.onToggleFavorite) {
            callbacks.onToggleFavorite(prompt.id, prompt.is_favorite);
        }
    });
    header.appendChild(favBtn);
    body.appendChild(header);

    /* Título */
    const title = document.createElement('h3');
    title.className = 'prompt-card__title';
    title.textContent = prompt.title;
    body.appendChild(title);

    /* Proveedor + Modelo */
    if (prompt.provider || prompt.model_name) {
        const meta = document.createElement('div');
        meta.className = 'prompt-card__meta';
        const parts = [prompt.provider, prompt.model_name].filter(Boolean);
        meta.textContent = parts.join(' · ');
        body.appendChild(meta);
    }

    /* Preview del prompt */
    const preview = document.createElement('p');
    preview.className = 'prompt-card__preview';
    preview.textContent = truncate(prompt.prompt_text, 100);
    body.appendChild(preview);

    /* Categorías */
    if (categories.length > 0) {
        const catContainer = document.createElement('div');
        catContainer.className = 'prompt-card__categories';

        const maxShow = 2;
        categories.slice(0, maxShow).forEach((cat) => {
            const pill = document.createElement('span');
            pill.className = 'prompt-card__cat-pill';
            if (cat.color) {
                pill.style.borderColor = cat.color;
                pill.style.color = cat.color;
            }
            pill.textContent = cat.name;
            catContainer.appendChild(pill);
        });

        if (categories.length > maxShow) {
            const more = document.createElement('span');
            more.className = 'prompt-card__cat-pill prompt-card__cat-pill--more';
            more.textContent = `+${categories.length - maxShow}`;
            catContainer.appendChild(more);
        }

        body.appendChild(catContainer);
    }

    /* Etiquetas */
    if (tags.length > 0) {
        const tagContainer = document.createElement('div');
        tagContainer.className = 'prompt-card__tags';

        const maxShow = 3;
        tags.slice(0, maxShow).forEach((tag) => {
            const chip = document.createElement('span');
            chip.className = 'prompt-card__tag-chip';
            chip.textContent = tag.name;
            tagContainer.appendChild(chip);
        });

        if (tags.length > maxShow) {
            const more = document.createElement('span');
            more.className = 'prompt-card__tag-chip prompt-card__tag-chip--more';
            more.textContent = `+${tags.length - maxShow}`;
            tagContainer.appendChild(more);
        }

        body.appendChild(tagContainer);
    }

    /* Footer: versión + fecha */
    const footer = document.createElement('div');
    footer.className = 'prompt-card__footer';

    const version = document.createElement('span');
    version.className = 'prompt-card__version';
    version.textContent = `v${prompt.version}`;
    footer.appendChild(version);

    const date = document.createElement('span');
    date.className = 'prompt-card__date';
    date.textContent = formatDate(prompt.updated_at);
    footer.appendChild(date);

    body.appendChild(footer);

    /* ---- Acciones rápidas ---- */
    const actions = document.createElement('div');
    actions.className = 'prompt-card__actions';

    /* Botón copiar */
    const copyBtn = createActionButton('Copiar prompt', '📋', () => {
        if (callbacks.onCopy) callbacks.onCopy(prompt.id, prompt.prompt_text);
    });
    actions.appendChild(copyBtn);

    /* Menú contextual (editar, duplicar, eliminar) */
    const menuBtn = document.createElement('button');
    menuBtn.className = 'prompt-card__menu-btn';
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label', 'Más acciones');
    menuBtn.setAttribute('aria-haspopup', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = '⋮';

    const menu = document.createElement('div');
    menu.className = 'prompt-card__menu';
    menu.setAttribute('role', 'menu');

    const editItem = createMenuItem('Editar', () => {
        if (callbacks.onEdit) callbacks.onEdit(prompt.id);
    });
    const dupItem = createMenuItem('Duplicar', () => {
        if (callbacks.onDuplicate) callbacks.onDuplicate(prompt.id);
    });
    const delItem = createMenuItem('Eliminar', () => {
        if (callbacks.onDelete) callbacks.onDelete(prompt.id, prompt.title);
    });
    delItem.classList.add('prompt-card__menu-item--danger');

    menu.appendChild(editItem);
    menu.appendChild(dupItem);
    menu.appendChild(delItem);

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle('prompt-card__menu--open');
        menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    /* Cerrar menú al hacer clic fuera */
    document.addEventListener('click', () => {
        menu.classList.remove('prompt-card__menu--open');
        menuBtn.setAttribute('aria-expanded', 'false');
    });

    actions.appendChild(menuBtn);
    actions.appendChild(menu);
    body.appendChild(actions);

    card.appendChild(body);

    /* Abrir detalle al click en la tarjeta */
    card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('.prompt-card__menu')) return;
        if (callbacks.onOpen) callbacks.onOpen(prompt.id);
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.closest('button')) {
            if (callbacks.onOpen) callbacks.onOpen(prompt.id);
        }
    });

    return card;
}

/* ---- SKELETON LOADER ---- */

/**
 * Crea una tarjeta skeleton para el estado de carga.
 * @returns {HTMLElement}
 */
export function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'prompt-card prompt-card--skeleton';
    card.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'prompt-card__body';

    const line1 = document.createElement('div');
    line1.className = 'skeleton-line skeleton-line--short';
    body.appendChild(line1);

    const line2 = document.createElement('div');
    line2.className = 'skeleton-line skeleton-line--title';
    body.appendChild(line2);

    const line3 = document.createElement('div');
    line3.className = 'skeleton-line skeleton-line--full';
    body.appendChild(line3);

    const line4 = document.createElement('div');
    line4.className = 'skeleton-line skeleton-line--medium';
    body.appendChild(line4);

    card.appendChild(body);
    return card;
}

/* ---- HELPERS INTERNOS ---- */

function createActionButton(label, icon, onClick) {
    const btn = document.createElement('button');
    btn.className = 'prompt-card__action-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.textContent = icon;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
    });
    return btn;
}

function createMenuItem(label, onClick) {
    const item = document.createElement('button');
    item.className = 'prompt-card__menu-item';
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.textContent = label;
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
    });
    return item;
}
