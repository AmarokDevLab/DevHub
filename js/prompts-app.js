/* ============================================================
   DEVHUB — ORQUESTADOR DEL MÓDULO PROMPTS IA
   ============================================================
   Punto de entrada para prompts.html. Gestiona:
   1. Auth guard (verifica sesión).
   2. Inicialización de componentes.
   3. Carga de datos.
   4. Coordinación entre búsqueda, filtros, lista y detalle.
   ============================================================ */

import { LOGIN_URL } from './config.js';
import { getSession, signOut, onAuthStateChange } from './auth-service.js';
import {
    listPrompts,
    getPrompt,
    deletePrompt,
    duplicatePrompt,
    toggleFavorite,
    updateLastUsed,
    loadRelationsForPrompts,
    PAGE_SIZE,
} from './services/prompts-service.js';
import { listCategories, seedDefaultCategories } from './services/categories-service.js';
import { listTags } from './services/tags-service.js';
import { copyToClipboard, showCopyToast } from './utils/clipboard.js';
import { debounce } from './utils/debounce.js';
import { createPromptCard, createSkeletonCard } from './components/prompt-card.js';
import { initFilters, updateFilterOptions, getActiveFilters, getActiveSort, clearAllFilters } from './components/prompt-filters.js';
import { initForm, updateFormOptions, openForCreate, openForEdit, closeDrawer } from './components/prompt-form.js';
import { initDetail, showDetail, closeDetail } from './components/prompt-detail.js';

/* ---- ESTADO GLOBAL ---- */

let currentUser = null;
let currentPage = 0;
let totalPrompts = 0;
let allCategories = [];
let allTags = [];
let isLoading = false;

/* ---- REFERENCIAS AL DOM ---- */

const globalLoader = document.getElementById('global-loader');
const promptsMain = document.getElementById('prompts-main');
const promptsGrid = document.getElementById('prompts-grid');
const emptyState = document.getElementById('empty-state');
const noResultsState = document.getElementById('no-results-state');
const resultsCount = document.getElementById('results-count');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchInput = document.getElementById('search-input');
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filtersBar = document.getElementById('filters-bar');

/* ---- INICIALIZACIÓN ---- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
    /* 1. Auth guard */
    const { session } = await getSession();
    if (!session) {
        window.location.href = LOGIN_URL;
        return;
    }

    currentUser = session.user;

    /* 2. Listener de auth */
    onAuthStateChange((event, sess) => {
        if (event === 'SIGNED_OUT' || !sess) {
            window.location.href = LOGIN_URL;
        }
    });

    /* 3. Logout button */
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            logoutBtn.disabled = true;
            await signOut();
        });
    }

    /* 3.5. Navbar Toggle Móvil */
    const navToggle = document.querySelector('.devhub-nav__toggle');
    const navMenu = document.getElementById('devhub-nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !expanded);
            navMenu.classList.toggle('devhub-nav__menu--open');
        });
    }

    /* 4. Seed categorías por defecto (primera vez) */
    await seedDefaultCategories(currentUser.id);

    /* 5. Cargar datos auxiliares */
    const [catResult, tagResult] = await Promise.all([
        listCategories(),
        listTags(),
    ]);

    allCategories = catResult.success ? catResult.data : [];
    allTags = tagResult.success ? tagResult.data : [];

    /* 6. Inicializar componentes */
    initFilters({
        onChange: handleFilterChange,
        categories: allCategories,
        tags: allTags,
    });

    initForm({
        userId: currentUser.id,
        onSave: handlePromptSaved,
        onClose: () => {},
        categories: allCategories,
        tags: allTags,
    });

    initDetail({
        onEdit: handleEditPrompt,
        onDuplicate: handleDuplicatePrompt,
        onDelete: handleRequestDelete,
        onClose: () => {},
    });

    /* 7. Bind events */
    bindEvents();

    /* 8. Mostrar UI y cargar prompts */
    hideLoader();
    promptsMain.style.display = '';
    await loadPrompts(false);
}

/* ---- EVENT BINDINGS ---- */

function bindEvents() {
    /* Nuevo prompt */
    document.getElementById('new-prompt-btn')?.addEventListener('click', openForCreate);
    document.getElementById('empty-new-prompt-btn')?.addEventListener('click', openForCreate);

    /* Búsqueda con debounce */
    const debouncedSearch = debounce(() => {
        currentPage = 0;
        loadPrompts(false);
    }, 350);

    searchInput?.addEventListener('input', debouncedSearch);

    /* Toggle de filtros */
    filterToggleBtn?.addEventListener('click', () => {
        filtersBar.classList.toggle('filters-bar--visible');
    });

    /* Cargar más */
    loadMoreBtn?.addEventListener('click', async () => {
        currentPage++;
        await loadPrompts(true);
    });

    /* Confirmación de eliminación */
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', hideDeleteModal);
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);
}

/* ---- CARGA DE PROMPTS ---- */

async function loadPrompts(append = false) {
    if (isLoading) return;
    isLoading = true;

    if (!append) {
        showSkeletons();
    } else {
        const spinner = loadMoreBtn?.querySelector('.spinner-border');
        if (spinner) spinner.classList.remove('d-none');
        if (loadMoreBtn) loadMoreBtn.disabled = true;
    }

    try {
        const search = searchInput?.value || '';
        const filters = getActiveFilters();
        const sort = getActiveSort();

        const result = await listPrompts({
            search,
            filters,
            sort,
            page: currentPage,
            pageSize: PAGE_SIZE,
        });

        if (!result.success) {
            showError(result.error);
            return;
        }

        totalPrompts = result.total;
        resultsCount.textContent = totalPrompts;

        if (!append) {
            promptsGrid.textContent = '';
        }

        if (result.data.length === 0 && !append) {
            if (search || Object.keys(filters).length > 0) {
                showNoResults();
            } else {
                showEmpty();
            }
            return;
        }

        hideStates();

        /* Cargar relaciones para todas las tarjetas */
        const promptIds = result.data.map((p) => p.id);
        const { categories, tags } = await loadRelationsForPrompts(promptIds);

        /* Renderizar tarjetas */
        result.data.forEach((prompt) => {
            const card = createPromptCard(
                prompt,
                categories.get(prompt.id) || [],
                tags.get(prompt.id) || [],
                {
                    onOpen: handleOpenPrompt,
                    onCopy: handleCopyPrompt,
                    onToggleFavorite: handleToggleFavorite,
                    onEdit: handleEditPrompt,
                    onDuplicate: handleDuplicatePrompt,
                    onDelete: handleRequestDelete,
                }
            );
            promptsGrid.appendChild(card);
        });

        /* Botón cargar más */
        const loaded = (currentPage + 1) * PAGE_SIZE;
        if (loaded < totalPrompts) {
            loadMoreBtn.style.display = 'flex';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    } catch (err) {
        console.error('Error cargando prompts:', err);
        showError('Error al cargar los prompts.');
    } finally {
        isLoading = false;
        const spinner = loadMoreBtn?.querySelector('.spinner-border');
        if (spinner) spinner.classList.add('d-none');
        if (loadMoreBtn) loadMoreBtn.disabled = false;
    }
}

/* ---- HANDLERS ---- */

function handleFilterChange() {
    currentPage = 0;
    loadPrompts(false);
}

async function handlePromptSaved() {
    /* Recargar datos auxiliares por si se crearon categorías/etiquetas nuevas */
    await refreshAuxData();
    currentPage = 0;
    await loadPrompts(false);
}

async function handleOpenPrompt(id) {
    const result = await getPrompt(id);
    if (result.success) {
        showDetail(result.data);
    } else {
        showCopyToast('No se pudo abrir el prompt', 'error');
    }
}

async function handleCopyPrompt(id, text) {
    await copyToClipboard(text);
    await updateLastUsed(id);
}

async function handleToggleFavorite(id, current) {
    const result = await toggleFavorite(id, current);
    if (result.success) {
        currentPage = 0;
        await loadPrompts(false);
    }
}

async function handleEditPrompt(id) {
    closeDetail();
    const result = await getPrompt(id);
    if (result.success) {
        openForEdit(result.data, result.data.categories || [], result.data.tags || []);
    } else {
        showCopyToast('No se pudo cargar el prompt para editar', 'error');
    }
}

async function handleDuplicatePrompt(id) {
    closeDetail();
    const result = await duplicatePrompt(id, currentUser.id);
    if (result.success) {
        showCopyToast('Prompt duplicado');
        currentPage = 0;
        await loadPrompts(false);
    } else {
        showCopyToast(result.error || 'Error al duplicar', 'error');
    }
}

/* ---- ELIMINACIÓN ---- */

let pendingDeleteId = null;
let pendingDeleteTitle = '';

function handleRequestDelete(id, title) {
    pendingDeleteId = id;
    pendingDeleteTitle = title || 'este prompt';
    closeDetail();

    const textEl = document.getElementById('confirm-delete-text');
    if (textEl) {
        textEl.textContent = `¿Estás seguro de que deseas eliminar "${pendingDeleteTitle}"? Esta acción eliminará el prompt y sus imágenes asociadas de forma permanente.`;
    }

    const overlay = document.getElementById('confirm-delete-overlay');
    if (overlay) overlay.classList.add('confirm-modal-overlay--visible');

    /* Focus en cancelar para accesibilidad */
    setTimeout(() => {
        document.getElementById('confirm-cancel-btn')?.focus();
    }, 100);
}

function hideDeleteModal() {
    const overlay = document.getElementById('confirm-delete-overlay');
    if (overlay) overlay.classList.remove('confirm-modal-overlay--visible');
    pendingDeleteId = null;
}

async function confirmDelete() {
    if (!pendingDeleteId) return;

    const deleteBtn = document.getElementById('confirm-delete-btn');
    if (deleteBtn) deleteBtn.disabled = true;

    const result = await deletePrompt(pendingDeleteId, currentUser.id);

    if (result.success) {
        showCopyToast('Prompt eliminado');
        currentPage = 0;
        await loadPrompts(false);
    } else {
        showCopyToast(result.error || 'Error al eliminar', 'error');
    }

    if (deleteBtn) deleteBtn.disabled = false;
    hideDeleteModal();
}

/* ---- ESTADOS DE UI ---- */

function showSkeletons() {
    promptsGrid.textContent = '';
    for (let i = 0; i < 8; i++) {
        promptsGrid.appendChild(createSkeletonCard());
    }
    hideStates();
}

function showEmpty() {
    promptsGrid.textContent = '';
    emptyState.style.display = '';
    noResultsState.style.display = 'none';
    loadMoreBtn.style.display = 'none';
}

function showNoResults() {
    promptsGrid.textContent = '';
    noResultsState.style.display = '';
    emptyState.style.display = 'none';
    loadMoreBtn.style.display = 'none';
}

function hideStates() {
    emptyState.style.display = 'none';
    noResultsState.style.display = 'none';
}

function showError(message) {
    promptsGrid.textContent = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-state__icon';
    icon.textContent = '❌';
    errorDiv.appendChild(icon);

    const title = document.createElement('h3');
    title.className = 'empty-state__title';
    title.textContent = 'Error';
    errorDiv.appendChild(title);

    const text = document.createElement('p');
    text.className = 'empty-state__text';
    text.textContent = message;
    errorDiv.appendChild(text);

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn-new-prompt';
    retryBtn.textContent = 'Reintentar';
    retryBtn.addEventListener('click', () => {
        currentPage = 0;
        loadPrompts(false);
    });
    errorDiv.appendChild(retryBtn);

    promptsGrid.appendChild(errorDiv);
}

function hideLoader() {
    if (globalLoader) {
        setTimeout(() => {
            globalLoader.style.opacity = '0';
            globalLoader.style.visibility = 'hidden';
        }, 300);
    }
}

/* ---- DATOS AUXILIARES ---- */

async function refreshAuxData() {
    const [catResult, tagResult, providers, models] = await Promise.all([
        listCategories(),
        listTags(),
        getDistinctProviders(),
        getDistinctModels(),
    ]);

    allCategories = catResult.success ? catResult.data : allCategories;
    allTags = tagResult.success ? tagResult.data : allTags;

    updateFilterOptions({
        categories: allCategories,
        tags: allTags,
        providers,
        models,
    });

    updateFormOptions({
        categories: allCategories,
        tags: allTags,
        providers,
        models,
    });
}
