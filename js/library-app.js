/* ============================================================
   DEVHUB — ORQUESTADOR DEL MÓDULO BIBLIOTECA
   ============================================================
   Punto de entrada para biblioteca.html. Gestiona:
   1. Auth guard (verifica sesión).
   2. Carga de categorías, etiquetas y elementos.
   3. CRUD completo, filtros y paginación.
   ============================================================ */

import { LOGIN_URL } from './config.js';
import { getSession, signOut, onAuthStateChange } from './auth-service.js';
import { getCategories, createCategory } from './services/library-categories-service.js';
import { getLibraryTags, createLibraryTag } from './services/library-tags-service.js';
import { uploadPreviewImage, getSignedUrl } from './services/library-storage-service.js';
import {
    getLibraryItems,
    createLibraryItem,
    updateLibraryItem,
    deleteLibraryItem,
    togglePinStatus,
    PAGE_SIZE,
} from './services/library-items-service.js';
import { debounce } from './utils/debounce.js';
import { copyToClipboard, showCopyToast } from './utils/clipboard.js';
import { validateUrl, validateImageFile } from './validators.js';
import { listProjectOptions } from './services/project-service.js';

/* ---- ESTADO ---- */
let currentUser = null;
const initialProjectId = new URLSearchParams(window.location.search).get('project') || '';
let currentPage = 1;
let totalItems = 0;
let isLoading = false;
let currentFilters = {
    search: '',
    resourceType: '',
    categoryId: '',
    tagId: '',
    projectId: initialProjectId,
    dateFrom: '',
    dateTo: '',
    isPinned: null,
    orderBy: 'recent',
};

let allCategories = [];
let allTags = [];
let allProjects = [];
let currentItemEditId = null;
let selectedTags = []; // [{id, name}, ...]
let itemToDeleteId = null;
let currentDetailItem = null;
const loadedItems = new Map();

/* ---- MAPAS ---- */
const ICONS = {
    article: 'bi-file-text', tutorial: 'bi-book', video: 'bi-play-circle',
    documentation: 'bi-journal-code', component: 'bi-puzzle', design: 'bi-palette',
    repository: 'bi-github', tool: 'bi-tools', other: 'bi-link',
};
const NAMES = {
    article: 'Artículo', tutorial: 'Tutorial', video: 'Video',
    documentation: 'Documentación', component: 'Componente', design: 'Diseño',
    repository: 'Repositorio', tool: 'Herramienta', other: 'Otro',
};

/* ---- REFERENCIAS DOM ---- */
const $ = (id) => document.getElementById(id);

/* ---- INIT ---- */
document.addEventListener('DOMContentLoaded', async () => {
    const loader = $('global-loader');
    const main = $('library-main');

    try {
        const { session } = await getSession();
        if (!session || !session.user) {
            window.location.replace(LOGIN_URL);
            return;
        }
        currentUser = session.user;

        /* Cargar datos en paralelo */
        await Promise.all([loadCategories(), loadTags(), loadProjects()]);

        /* Evento: buscar, filtrar, ordenar */
        setupListeners();
        updateActiveFilterCount();

        /* Cargar elementos iniciales */
        await fetchItems(true);

        /* Mostrar contenido */
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            main.style.display = 'block';
        }, 300);

        /* Monitor de sesión */
        onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') window.location.replace(LOGIN_URL);
        });

    } catch (err) {
        console.error('Error al iniciar Biblioteca:', err);
        loader.innerHTML = `
            <div class="text-center">
                <i class="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3"></i>
                <h2 class="h5 fw-bold mb-1">Error al cargar</h2>
                <p class="text-muted small mb-3">${err.message || 'Ocurrió un error inesperado.'}</p>
                <button class="btn btn-outline-primary rounded-pill" onclick="location.reload()">Reintentar</button>
            </div>`;
    }
});

/* ============================================================
   CARGA DE DATOS
   ============================================================ */

async function loadCategories() {
    const { success, data, error } = await getCategories(currentUser.id);
    if (!success) {
        console.warn('No se pudieron cargar las categorías:', error);
    }
    allCategories = data || [];
    fillCategorySelects();
}

async function loadTags() {
    const { success, data, error } = await getLibraryTags(currentUser.id);
    if (!success) {
        console.warn('No se pudieron cargar las etiquetas:', error);
    }
    allTags = data || [];
    fillTagFilter();
}

async function loadProjects() {
    const { success, data, error } = await listProjectOptions();
    if (!success) console.warn('No se pudieron cargar los proyectos:', error);
    allProjects = data || [];
    fillProjectSelects();
}

function fillProjectSelects() {
    const options = allProjects.map(project => {
        const suffix = project.is_archived ? ' · Archivado' : '';
        return `<option value="${project.id}">${escapeHtml(project.name)}${suffix}</option>`;
    }).join('');

    const filter = $('filter-project');
    const form = $('form-project');
    if (filter) {
        filter.innerHTML = '<option value="">Todos</option>' + options;
        filter.value = currentFilters.projectId || '';
    }
    if (form) form.innerHTML = '<option value="">Sin proyecto</option>' + options;
}

function fillTagFilter() {
    const select = $('filter-tag');
    if (!select) return;
    select.innerHTML = '<option value="">Todas</option>' +
        allTags.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
}

function fillCategorySelects() {
    const categoryOptions = allCategories
        .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        .join('');
    $('filter-category').innerHTML = '<option value="">Todas</option>' + categoryOptions;
    $('form-category').innerHTML = '<option value="">Sin categoría</option>' + categoryOptions;
}

async function fetchItems(reset = false) {
    if (isLoading) return;
    isLoading = true;

    const grid = $('library-grid');
    const loadBtn = $('load-more-btn');

    if (reset) {
        currentPage = 1;
        grid.innerHTML = '';
        loadedItems.clear();
        $('results-count').textContent = '…';
    }

    const { success, data, count, error } = await getLibraryItems(currentUser.id, {
        page: currentPage,
        limit: PAGE_SIZE,
        ...currentFilters,
    });

    if (!success) {
        isLoading = false;
        console.error("Error fetching library items:", error);
        $('library-alerts').innerHTML = `<div class="alert alert-danger m-3"><i class="bi bi-exclamation-triangle-fill"></i> Error al cargar recursos: ${escapeHtml(error || 'Error desconocido')}</div>`;
        
        // Hide loader anyway if it's initial load
        $('global-loader').style.display = 'none';
        $('library-main').style.display = 'block';
        return;
    }

    // Clear previous alerts
    $('library-alerts').innerHTML = '';

    if (reset) {
        totalItems = Number.isFinite(count) ? count : (data?.length || 0);
        $('results-count').textContent = `${totalItems} recursos`;

        const hasFilters = currentFilters.search || currentFilters.resourceType ||
            currentFilters.categoryId || currentFilters.tagId || currentFilters.projectId ||
            currentFilters.dateFrom || currentFilters.dateTo ||
            currentFilters.isPinned;

        $('empty-state').style.display = totalItems === 0 && !hasFilters ? 'block' : 'none';
        $('no-results-state').style.display = totalItems === 0 && hasFilters ? 'block' : 'none';

        if (totalItems === 0 && !hasFilters) {
            renderEmptyDiagnostic();
        }
    }

    if (data && data.length > 0) {
        for (const item of data) {
            loadedItems.set(item.id, item);
            grid.appendChild(buildCard(item));
        }
        loadBtn.style.display = data.length >= PAGE_SIZE ? 'inline-flex' : 'none';
    } else if (reset) {
        loadBtn.style.display = 'none';
    }

    isLoading = false;
}


function renderEmptyDiagnostic() {
    const emptyState = $('empty-state');
    if (!emptyState || !currentUser) return;

    let diagnostic = $('library-empty-diagnostic');
    if (!diagnostic) {
        diagnostic = document.createElement('div');
        diagnostic.id = 'library-empty-diagnostic';
        diagnostic.className = 'alert alert-warning text-start mx-auto mt-4';
        diagnostic.style.maxWidth = '760px';
        emptyState.appendChild(diagnostic);
    }

    const email = escapeHtml(currentUser.email || 'sin correo');
    const id = escapeHtml(currentUser.id || 'sin UUID');
    diagnostic.innerHTML = `
        <strong><i class="bi bi-shield-lock me-1"></i> Diagnóstico de acceso</strong>
        <p class="small mb-2 mt-2">
            La consulta llegó correctamente a Supabase, pero RLS no devolvió filas para la sesión actual.
            Verifica que el <code>user_id</code> de tus registros sea exactamente el UUID mostrado abajo.
        </p>
        <div class="small"><strong>Usuario:</strong> ${email}</div>
        <div class="small text-break"><strong>UUID:</strong> <code>${id}</code></div>`;
}

/* ============================================================
   RENDERIZADO DE TARJETA
   ============================================================ */

function buildCard(item) {
    const card = document.createElement('article');
    card.className = 'clay-card resource-card';
    card.id = `item-${item.id}`;
    card.dataset.itemId = item.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver detalles de ${item.title}`);

    const icon = ICONS[item.resource_type] || ICONS.other;
    const typeName = NAMES[item.resource_type] || 'Otro';
    const domain = parseDomain(item.url);
    const date = formatDate(item.updated_at || item.created_at);

    let imgHtml;
    if (item.preview_external_url) {
        imgHtml = `<img src="${escapeHtml(item.preview_external_url)}" alt="${escapeHtml(item.title)}" class="resource-card__img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                   <i class="bi bi-image-alt resource-card__placeholder-icon" style="display:none"></i>`;
    } else {
        imgHtml = `<i class="bi bi-${icon.replace('bi-', '')} resource-card__placeholder-icon"></i>`;
    }

    let metaHtml = '';
    if (item.library_categories) {
        metaHtml += `<span class="resource-card__tag resource-card__category">${escapeHtml(item.library_categories.name)}</span>`;
    }
    if (item.library_item_tags) {
        item.library_item_tags.slice(0, 3).forEach(lit => {
            if (lit.tags) metaHtml += `<span class="resource-card__tag">#${escapeHtml(lit.tags.name)}</span>`;
        });
    }

    card.innerHTML = `
        <div class="resource-card__preview">
            ${imgHtml}
            <button type="button" class="resource-card__fav-btn${item.is_pinned ? ' resource-card__fav-btn--active' : ''}" aria-label="${item.is_pinned ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${item.is_pinned ? 'true' : 'false'}">${item.is_pinned ? '★' : '☆'}</button>
            <div class="resource-card__type-badge"><i class="bi ${icon}"></i> ${typeName}</div>
        </div>
        <div class="resource-card__actions-menu">
                <button type="button" class="resource-card__btn-icon resource-card__quick-copy act-copy" title="Copiar URL" aria-label="Copiar URL">
                    <i class="bi bi-clipboard"></i>
                </button>
                <div class="dropdown">
                    <button type="button" class="resource-card__btn-icon resource-card__menu-trigger" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Más acciones">
                        <i class="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                        <li class="resource-card__copy-menu-entry"><button type="button" class="dropdown-item act-copy"><i class="bi bi-clipboard me-2"></i>Copiar URL</button></li>
                        <li class="resource-card__copy-menu-entry"><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item act-edit" href="#"><i class="bi bi-pencil me-2"></i>Editar</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger act-delete" href="#"><i class="bi bi-trash me-2"></i>Eliminar</a></li>
                    </ul>
                </div>
        </div>
        <div class="resource-card__body">
            <div class="resource-card__domain">${escapeHtml(domain)}</div>
            <h3 class="resource-card__title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
            <p class="resource-card__desc">${escapeHtml(item.description || item.personal_notes || 'Sin descripción')}</p>
            <div class="resource-card__meta">${metaHtml}</div>
            <div class="resource-card__footer">
                <span class="resource-card__date">${date}</span>
                <div class="resource-card__footer-actions">
                    <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="clay-btn resource-card__open-btn">Abrir</a>
                </div>
            </div>
        </div>`;

    const openDetails = () => showItemDetail(item);
    card.addEventListener('click', (e) => {
        if (e.target.closest('button, a, .dropdown-menu')) return;
        openDetails();
    });
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetails();
        }
    });

    card.querySelector('.resource-card__fav-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleFavorite(item.id, !item.is_pinned, e.currentTarget);
    });
    card.querySelector('.act-edit').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openEditModal(item); });
    card.querySelector('.act-delete').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); promptDelete(item.id); });
    card.querySelectorAll('.act-copy').forEach((copyButton) => {
        copyButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const result = await copyToClipboard(item.url);
            showCopyToast(result.success ? 'URL copiada' : (result.error || 'No fue posible copiar la URL'), result.success ? 'success' : 'error');
        });
    });
    card.querySelector('.resource-card__open-btn').addEventListener('click', (e) => e.stopPropagation());
    card.querySelectorAll('.resource-card__btn-icon').forEach((button) => {
        button.addEventListener('click', (e) => e.stopPropagation());
    });

    return card;
}

function parseDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch (e) { return 'Enlace'; }
}

function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

/* ============================================================
   EVENTOS
   ============================================================ */

function setupListeners() {
    /* Logout */
    $('nav-logout-btn').addEventListener('click', async () => {
        await signOut();
        window.location.replace(LOGIN_URL);
    });

    /* Mobile nav toggle */
    const toggle = document.querySelector('.devhub-nav__toggle');
    const menu = $('devhub-nav-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            const open = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !open);
            menu.classList.toggle('devhub-nav__menu--open');
        });
    }

    /* Filtros panel */
    $('filter-toggle-btn').addEventListener('click', () => {
        const panel = $('filters-panel');
        const visible = panel.classList.toggle('filters-bar--visible');
        $('filter-toggle-btn').setAttribute('aria-expanded', visible ? 'true' : 'false');
    });

    /* Búsqueda y filtros */
    const applyFilters = () => {
        currentFilters = {
            search: $('search-input').value.trim(),
            resourceType: $('filter-type').value,
            categoryId: $('filter-category').value,
            tagId: $('filter-tag').value,
            projectId: $('filter-project').value,
            dateFrom: $('filter-date-from').value,
            dateTo: $('filter-date-to').value,
            isPinned: $('filter-pinned').checked ? true : null,
            orderBy: $('filter-sort').value,
        };
        const url = new URL(window.location.href);
        if (currentFilters.projectId) url.searchParams.set('project', currentFilters.projectId);
        else url.searchParams.delete('project');
        window.history.replaceState({}, '', url);
        updateActiveFilterCount();
        fetchItems(true);
    };

    $('search-input').addEventListener('input', debounce(applyFilters, 400));
    ['filter-sort', 'filter-type', 'filter-category', 'filter-tag', 'filter-project', 'filter-date-from', 'filter-date-to'].forEach(id => {
        $(id).addEventListener('change', applyFilters);
    });
    $('filter-pinned').addEventListener('change', applyFilters);

    $('clear-filters-btn').addEventListener('click', () => {
        $('search-input').value = '';
        $('filter-type').value = '';
        $('filter-category').value = '';
        $('filter-tag').value = '';
        $('filter-project').value = '';
        $('filter-date-from').value = '';
        $('filter-date-to').value = '';
        $('filter-pinned').checked = false;
        $('filter-sort').value = 'recent';
        applyFilters();
    });

    /* Load more */
    $('load-more-btn').addEventListener('click', () => {
        currentPage++;
        fetchItems(false);
    });

    /* Abrir modal creación */
    $('new-item-btn').addEventListener('click', openCreateModal);
    $('empty-new-item-btn').addEventListener('click', openCreateModal);

    /* Imagen preview sync */
    $('form-preview-url').addEventListener('input', debounce(() => showImgPreview($('form-preview-url').value), 300));
    $('form-preview-file').addEventListener('change', handleFilePreview);
    $('remove-image-btn').addEventListener('click', clearImgPreview);

    /* Tags inline */
    $('btn-add-tag').addEventListener('click', addTagInline);
    $('tag-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTagInline(); } });

    /* Categoría inline */
    $('btn-new-category').addEventListener('click', openCategoryModal);

    /* Submit formulario */
    $('form-save-btn').addEventListener('click', handleSubmit);

    /* Confirmar eliminación */
    $('confirm-delete-btn').addEventListener('click', confirmDelete);

    /* Drawer form controls */
    $('form-close-btn').addEventListener('click', closeDrawer);
    $('form-cancel-btn').addEventListener('click', closeDrawer);
    $('form-drawer-overlay').addEventListener('click', closeDrawer);

    /* Panel de detalle */
    $('detail-close-btn').addEventListener('click', closeItemDetail);
    $('detail-overlay').addEventListener('click', closeItemDetail);
    $('detail-edit-btn').addEventListener('click', () => {
        if (!currentDetailItem) return;
        const item = currentDetailItem;
        closeItemDetail();
        openEditModal(item);
    });
    $('detail-copy-url-btn').addEventListener('click', () => {
        if (!currentDetailItem) return;
        copyToClipboard(currentDetailItem.url);
    });
    $('detail-delete-btn').addEventListener('click', () => {
        if (!currentDetailItem) return;
        const id = currentDetailItem.id;
        closeItemDetail();
        promptDelete(id);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if ($('detail-panel').classList.contains('library-detail-panel--open')) closeItemDetail();
            else if ($('itemModal').classList.contains('library-drawer--open')) closeDrawer();
        }
    });
}

/* ============================================================
   PANEL DE DETALLE
   ============================================================ */

async function showItemDetail(item) {
    currentDetailItem = item;

    $('detail-title').textContent = item.title || 'Sin título';
    $('detail-domain').textContent = parseDomain(item.url);
    $('detail-url').textContent = item.url || '';
    $('detail-url').href = item.url || '#';
    $('detail-open-btn').href = item.url || '#';

    const typeName = NAMES[item.resource_type] || 'Otro';
    const icon = ICONS[item.resource_type] || ICONS.other;
    $('detail-type').innerHTML = `<i class="bi ${icon}"></i> ${escapeHtml(typeName)}`;
    setDetailSection('detail-description-section', 'detail-description', item.description);
    setDetailSection('detail-notes-section', 'detail-notes', item.personal_notes);

    const categoryEl = $('detail-category');
    categoryEl.className = '';
    categoryEl.textContent = '';
    if (item.library_categories) {
        const badge = document.createElement('span');
        badge.className = 'resource-card__tag resource-card__category';
        badge.textContent = item.library_categories.name;
        categoryEl.appendChild(badge);
    } else {
        categoryEl.textContent = 'Sin categoría';
        categoryEl.className = 'text-muted small';
    }

    const tagsEl = $('detail-tags');
    tagsEl.textContent = '';
    const tags = (item.library_item_tags || []).map(rel => rel.tags).filter(Boolean);
    if (tags.length) {
        tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'resource-card__tag';
            chip.textContent = `#${tag.name}`;
            tagsEl.appendChild(chip);
        });
    } else {
        const empty = document.createElement('span');
        empty.className = 'text-muted small';
        empty.textContent = 'Sin etiquetas';
        tagsEl.appendChild(empty);
    }

    const projectEl = $('detail-project');
    projectEl.className = '';
    const relatedProject = allProjects.find(project => project.id === item.project_id);
    projectEl.textContent = '';
    if (relatedProject) {
        const link = document.createElement('a');
        link.href = `proyectos.html?open=${encodeURIComponent(relatedProject.id)}`;
        link.className = 'resource-card__tag resource-card__project';
        link.textContent = relatedProject.name;
        projectEl.appendChild(link);
    } else {
        projectEl.className = 'text-muted small';
        projectEl.textContent = 'Sin proyecto';
    }

    $('detail-created').textContent = formatDateLong(item.created_at);
    $('detail-updated').textContent = formatDateLong(item.updated_at);
    await loadDetailImage(item);

    $('detail-panel').classList.add('library-detail-panel--open');
    $('detail-panel').setAttribute('aria-hidden', 'false');
    $('detail-overlay').classList.add('library-detail-overlay--visible');
    if (window.innerWidth < 992) document.body.style.overflow = 'hidden';
    setTimeout(() => $('detail-close-btn').focus(), 250);
}

function closeItemDetail() {
    $('detail-panel').classList.remove('library-detail-panel--open');
    $('detail-panel').setAttribute('aria-hidden', 'true');
    $('detail-overlay').classList.remove('library-detail-overlay--visible');
    document.body.style.overflow = '';
    currentDetailItem = null;
}

function setDetailSection(sectionId, contentId, value) {
    const section = $(sectionId);
    const content = $(contentId);
    const hasValue = Boolean(value && String(value).trim());
    section.style.display = hasValue ? '' : 'none';
    content.textContent = hasValue ? value : '';
}


async function loadDetailImage(item) {
    const section = $('detail-image-section');
    const img = $('detail-image');
    let url = item.preview_external_url || '';

    if (!url && item.preview_storage_path) {
        const signed = await getSignedUrl(item.preview_storage_path);
        if (signed.success) url = signed.url;
    }

    if (!url) {
        section.style.display = 'none';
        img.removeAttribute('src');
        return;
    }

    section.style.display = '';
    img.src = url;
    img.alt = `Vista previa de ${item.title || 'recurso'}`;
    img.onerror = () => { section.style.display = 'none'; };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatDateLong(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function updateActiveFilterCount() {
    const values = [
        $('filter-type').value,
        $('filter-category').value,
        $('filter-tag').value,
        $('filter-project').value,
        $('filter-date-from').value,
        $('filter-date-to').value,
        $('filter-pinned').checked,
    ];
    const count = values.filter(Boolean).length;
    const badge = $('filter-count-badge');
    badge.textContent = count ? String(count) : '';
    badge.style.display = count ? 'inline-flex' : 'none';
    $('clear-filters-btn').style.display = count ? 'inline-flex' : 'none';
}

/* ============================================================
   MODAL — CREAR / EDITAR
   ============================================================ */

function openDrawer() {
    const drawer = $('itemModal');
    const overlay = $('form-drawer-overlay');
    if (drawer) {
        drawer.classList.add('library-drawer--open');
        drawer.setAttribute('aria-hidden', 'false');
    }
    if (overlay) overlay.classList.add('library-drawer-overlay--visible');
    document.body.style.overflow = 'hidden';

    /* Focus en el título al abrir */
    setTimeout(() => {
        const titleInput = $('form-title');
        if (titleInput) titleInput.focus();
    }, 300);
}

function closeDrawer() {
    const drawer = $('itemModal');
    const overlay = $('form-drawer-overlay');
    if (drawer) {
        drawer.classList.remove('library-drawer--open');
        drawer.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('library-drawer-overlay--visible');
    document.body.style.overflow = '';
}

function getDeleteModal() {
    return bootstrap.Modal.getOrCreateInstance($('deleteConfirmModal'));
}

function resetForm() {
    $('item-form').reset();
    $('item-form').classList.remove('was-validated');
    currentItemEditId = null;
    $('itemModalLabel').textContent = 'Nuevo Recurso';
    selectedTags = [];
    renderSelectedTags();
    clearImgPreview();
    delete $('form-preview-file').dataset.currentPath;
}

function openCreateModal() {
    resetForm();
    openDrawer();
}

function openEditModal(item) {
    resetForm();
    currentItemEditId = item.id;
    $('itemModalLabel').textContent = 'Editar Recurso';

    $('form-url').value = item.url;
    $('form-title').value = item.title;
    $('form-type').value = item.resource_type;
    $('form-desc').value = item.description || '';
    $('form-category').value = item.category_id || '';
    $('form-project').value = item.project_id || '';
    $('form-notes').value = item.personal_notes || '';

    if (item.preview_external_url) {
        $('form-preview-url').value = item.preview_external_url;
        showImgPreview(item.preview_external_url);
    }
    if (item.preview_storage_path) {
        $('form-preview-file').dataset.currentPath = item.preview_storage_path;
    }

    if (item.library_item_tags) {
        selectedTags = item.library_item_tags
            .filter(lit => lit.tags)
            .map(lit => ({ id: lit.tags.id, name: lit.tags.name }));
        renderSelectedTags();
    }

    openDrawer();
}

/* ============================================================
   TAGS & CATEGORÍAS INLINE
   ============================================================ */

async function addTagInline() {
    const input = $('tag-input');
    const val = input.value.trim();
    if (!val) return;

    const { success, data } = await createLibraryTag(currentUser.id, { name: val });
    if (success && data) {
        if (!selectedTags.find(t => t.id === data.id)) {
            selectedTags.push({ id: data.id, name: data.name });
            renderSelectedTags();
        }
        input.value = '';
    }
}

function renderSelectedTags() {
    const container = $('selected-tags-container');
    container.innerHTML = '';
    selectedTags.forEach(t => {
        const badge = document.createElement('span');
        badge.className = 'library-tag-chip';
        badge.style.cursor = 'default';

        const name = document.createTextNode(t.name + ' ');
        const x = document.createElement('i');
        x.className = 'bi bi-x library-tag-chip__remove';
        x.style.cursor = 'pointer';
        x.addEventListener('click', () => {
            selectedTags = selectedTags.filter(st => st.id !== t.id);
            renderSelectedTags();
        });

        badge.appendChild(name);
        badge.appendChild(x);
        container.appendChild(badge);
    });
}

/* ---- Mini-modal de nueva categoría ---- */

function openCategoryModal() {
    const overlay = $('category-modal-overlay');
    const input = $('new-category-name');
    $('new-category-error').textContent = '';
    input.value = '';
    input.classList.remove('is-invalid');
    overlay.classList.add('is-visible');
    setTimeout(() => input.focus(), 150);

    /* Listeners temporales */
    const handleKeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveCategoryFromModal(); }
        if (e.key === 'Escape') { closeCategoryModal(); }
    };
    const handleOverlayClick = (e) => {
        if (e.target === overlay) closeCategoryModal();
    };

    input.addEventListener('keydown', handleKeydown);
    overlay.addEventListener('click', handleOverlayClick);
    $('category-cancel-btn').onclick = closeCategoryModal;
    $('category-save-btn').onclick = saveCategoryFromModal;

    /* Guardar refs para limpiar */
    overlay._cleanup = () => {
        input.removeEventListener('keydown', handleKeydown);
        overlay.removeEventListener('click', handleOverlayClick);
    };
}

function closeCategoryModal() {
    const overlay = $('category-modal-overlay');
    overlay.classList.remove('is-visible');
    if (overlay._cleanup) overlay._cleanup();
}

async function saveCategoryFromModal() {
    const input = $('new-category-name');
    const errorEl = $('new-category-error');
    const name = input.value.trim();

    if (!name) {
        input.classList.add('is-invalid');
        errorEl.textContent = 'El nombre no puede estar vacío.';
        input.focus();
        return;
    }
    if (name.length > 50) {
        input.classList.add('is-invalid');
        errorEl.textContent = 'Máximo 50 caracteres.';
        input.focus();
        return;
    }

    // Verificar si ya existe (case insensitive)
    const existing = allCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        input.classList.add('is-invalid');
        errorEl.textContent = 'Esta categoría ya existe.';
        input.focus();
        return;
    }

    input.classList.remove('is-invalid');
    errorEl.textContent = '';

    /* Deshabilitar botones mientras guarda */
    const saveBtn = $('category-save-btn');
    const spinner = $('category-spinner');
    saveBtn.disabled = true;
    spinner.classList.remove('d-none');

    const { success, data, error } = await createCategory(currentUser.id, { name });

    saveBtn.disabled = false;
    spinner.classList.add('d-none');

    if (success && data) {
        allCategories.push(data);
        fillCategorySelects();
        $('form-category').value = data.id;
        closeCategoryModal();
    } else {
        errorEl.textContent = error || 'Error al crear la categoría. Intenta de nuevo.';
        console.error('Error creating category:', error);
    }
}

/* ============================================================
   IMAGEN PREVIEW
   ============================================================ */

function showImgPreview(src) {
    if (!src) { clearImgPreview(); return; }
    const img = $('image-preview-img');
    const icon = $('image-preview-icon');
    img.src = src;
    img.style.display = 'block';
    icon.style.display = 'none';
    $('remove-image-btn').style.display = 'inline-block';
}

function handleFilePreview(e) {
    const file = e.target.files[0];
    if (!file) { clearImgPreview(); return; }

    const valid = validateImageFile(file);
    if (!valid.valid) {
        alert(valid.error);
        $('form-preview-file').value = '';
        clearImgPreview();
        return;
    }
    showImgPreview(URL.createObjectURL(file));
}

function clearImgPreview() {
    const img = $('image-preview-img');
    img.src = '';
    img.style.display = 'none';
    $('image-preview-icon').style.display = 'block';
    $('remove-image-btn').style.display = 'none';
    $('form-preview-url').value = '';
    $('form-preview-file').value = '';
    delete $('form-preview-file').dataset.currentPath;
}

/* ============================================================
   SUBMIT
   ============================================================ */

async function handleSubmit() {
    const form = $('item-form');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const url = $('form-url').value.trim();
    if (!validateUrl(url)) {
        alert('La URL debe ser válida e incluir http:// o https://');
        return;
    }

    const btn = $('form-save-btn');
    btn.disabled = true;
    btn.querySelector('.spinner-border').classList.remove('d-none');

    try {
        const file = $('form-preview-file').files[0];
        let externalUrl = !file ? ($('form-preview-url').value.trim() || null) : null;
        let storagePath = null;

        if (!file && !externalUrl && $('form-preview-file').dataset.currentPath) {
            storagePath = $('form-preview-file').dataset.currentPath;
        }

        const itemData = {
            url,
            title: $('form-title').value.trim(),
            resource_type: $('form-type').value,
            description: $('form-desc').value.trim() || null,
            category_id: $('form-category').value || null,
            project_id: $('form-project').value || null,
            personal_notes: $('form-notes').value.trim() || null,
            preview_external_url: externalUrl,
            preview_storage_path: storagePath,
        };

        const tagIds = selectedTags.map(t => t.id);
        let result;

        if (currentItemEditId) {
            result = await updateLibraryItem(currentUser.id, currentItemEditId, itemData, tagIds);
        } else {
            result = await createLibraryItem(currentUser.id, itemData, tagIds);
        }

        if (!result.success) throw new Error(result.error);

        /* Upload file si hay */
        if (file && result.data) {
            const up = await uploadPreviewImage(currentUser.id, result.data.id, file);
            if (up.success && up.path) {
                await updateLibraryItem(currentUser.id, result.data.id, { preview_storage_path: up.path });
            }
        }

        closeDrawer();
        await fetchItems(true);
        showCopyToast(currentItemEditId ? 'Recurso actualizado' : 'Recurso creado');

    } catch (err) {
        console.error(err);
        alert('Error al guardar: ' + (err.message || 'Intenta de nuevo.'));
    } finally {
        btn.disabled = false;
        btn.querySelector('.spinner-border').classList.add('d-none');
    }
}

/* ============================================================
   ACCIONES RÁPIDAS
   ============================================================ */

async function handleFavorite(id, newState, triggerButton = null) {
    if (triggerButton) triggerButton.disabled = true;
    const result = await togglePinStatus(currentUser.id, id, newState);

    if (!result.success) {
        if (triggerButton) triggerButton.disabled = false;
        alert('No se pudo actualizar el favorito: ' + (result.error || 'Error desconocido'));
        return;
    }

    const knownItem = loadedItems.get(id) || currentDetailItem;
    if (knownItem && knownItem.id === id) knownItem.is_pinned = newState;
    if (currentDetailItem?.id === id) {
        currentDetailItem.is_pinned = newState;
    }

    showCopyToast(newState ? 'Agregado a Favoritos' : 'Eliminado de Favoritos');
    await fetchItems(true);

    if (currentDetailItem?.id === id) {
        const refreshed = loadedItems.get(id);
        if (refreshed) currentDetailItem = refreshed;
    }
}


function promptDelete(id) {
    itemToDeleteId = id;
    getDeleteModal().show();
}

async function confirmDelete() {
    if (!itemToDeleteId) return;
    $('confirm-delete-btn').disabled = true;

    const { success } = await deleteLibraryItem(currentUser.id, itemToDeleteId);
    if (success) {
        if (currentDetailItem?.id === itemToDeleteId) closeItemDetail();
        getDeleteModal().hide();
        await fetchItems(true);
        showCopyToast('Recurso eliminado');
    } else {
        alert('Error al eliminar');
    }

    $('confirm-delete-btn').disabled = false;
    itemToDeleteId = null;
}
