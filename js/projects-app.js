/* ============================================================
   DEVHUB — ORQUESTADOR DEL MÓDULO PROYECTOS
   ============================================================ */

import { LOGIN_URL } from './config.js';
import { getSession, signOut, onAuthStateChange } from './auth-service.js';
import {
    PROJECT_PAGE_SIZE,
    listProjects,
    getProjectStats,
    getProject,
    createProject,
    updateProject,
    toggleProjectPinned,
    setProjectArchived,
    deleteProject,
} from './services/project-service.js';
import { listTechnologies, createTechnology } from './services/technology-service.js';
import { getProjectModuleSummary } from './services/project-summary-service.js';
import { debounce } from './utils/debounce.js';
import { copyToClipboard, showCopyToast } from './utils/clipboard.js';
import { createProjectCard, createProjectSkeleton } from './components/project-card.js';
import {
    initProjectFilters,
    updateTechnologyFilter,
    getProjectFilters,
    getProjectSort,
    persistFiltersToUrl,
} from './components/project-filters.js';
import {
    initProjectForm,
    updateProjectFormTechnologies,
    openProjectCreate,
    openProjectQuickCreate,
    openProjectEdit,
    closeProjectForm,
} from './components/project-form.js';
import {
    initProjectDetail,
    showProjectDetail,
    closeProjectDetail,
} from './components/project-detail.js';

let currentUser = null;
let technologies = [];
let currentPage = 0;
let totalProjects = 0;
let currentView = 'grid';
let loading = false;
let pendingDelete = null;
let currentDetailId = null;

const dom = {
    loader: document.getElementById('global-loader'),
    main: document.getElementById('projects-main'),
    grid: document.getElementById('projects-grid'),
    empty: document.getElementById('projects-empty-state'),
    noResults: document.getElementById('projects-no-results'),
    error: document.getElementById('projects-error-state'),
    errorText: document.getElementById('projects-error-text'),
    resultsCount: document.getElementById('project-results-count'),
    totalCount: document.getElementById('project-total-count'),
    activeCount: document.getElementById('project-active-count'),
    search: document.getElementById('project-search'),
    filterToggle: document.getElementById('project-filter-toggle'),
    filters: document.getElementById('project-filters'),
    prev: document.getElementById('project-page-prev'),
    next: document.getElementById('project-page-next'),
    pageLabel: document.getElementById('project-page-label'),
    pagination: document.getElementById('project-pagination'),
    gridView: document.getElementById('project-view-grid'),
    listView: document.getElementById('project-view-list'),
};

function hideLoader() {
    if (!dom.loader) return;
    setTimeout(() => {
        dom.loader.style.opacity = '0';
        dom.loader.style.visibility = 'hidden';
    }, 250);
}

function bindNavigation() {
    const navToggle = document.querySelector('.devhub-nav__toggle');
    const navMenu = document.getElementById('devhub-nav-menu');
    navToggle?.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        navMenu?.classList.toggle('devhub-nav__menu--open');
    });

    const logoutButton = document.getElementById('nav-logout-btn');
    const overlay = document.getElementById('logout-confirm-overlay');
    const cancel = document.getElementById('logout-cancel-btn');
    const confirm = document.getElementById('logout-confirm-btn');

    logoutButton?.addEventListener('click', () => overlay?.classList.add('logout-confirm-overlay--visible'));
    cancel?.addEventListener('click', () => overlay?.classList.remove('logout-confirm-overlay--visible'));
    overlay?.addEventListener('click', event => {
        if (event.target === overlay) overlay.classList.remove('logout-confirm-overlay--visible');
    });
    confirm?.addEventListener('click', async () => {
        confirm.disabled = true;
        confirm.textContent = 'Cerrando...';
        await signOut();
    });
}

function restorePageState() {
    const params = new URLSearchParams(window.location.search);
    dom.search.value = params.get('q') || '';
    const pageValue = Number(params.get('page') || '1');
    currentPage = Number.isFinite(pageValue) ? Math.max(0, pageValue - 1) : 0;
    currentView = params.get('view') || localStorage.getItem('devhub-project-view') || 'grid';
    if (!['grid', 'compact'].includes(currentView)) currentView = 'grid';
    applyView(currentView, false);
}

function applyView(view, reloadUrl = true) {
    currentView = view === 'compact' ? 'compact' : 'grid';
    dom.grid.classList.toggle('projects-grid--compact', currentView === 'compact');
    dom.gridView.classList.toggle('project-view-toggle__button--active', currentView === 'grid');
    dom.listView.classList.toggle('project-view-toggle__button--active', currentView === 'compact');
    dom.gridView.setAttribute('aria-pressed', String(currentView === 'grid'));
    dom.listView.setAttribute('aria-pressed', String(currentView === 'compact'));
    localStorage.setItem('devhub-project-view', currentView);
    if (reloadUrl) persistState();
}

function persistState() {
    persistFiltersToUrl(dom.search.value, currentPage, currentView);
}

function hideStates() {
    dom.empty.hidden = true;
    dom.noResults.hidden = true;
    dom.error.hidden = true;
}

function showSkeletons() {
    hideStates();
    dom.grid.textContent = '';
    for (let index = 0; index < 8; index += 1) dom.grid.appendChild(createProjectSkeleton());
}

function hasActiveQuery() {
    const filters = getProjectFilters();
    return Boolean(
        dom.search.value.trim()
        || filters.status
        || filters.projectType
        || filters.technologyId
        || filters.isPinned
        || filters.archived !== 'active'
        || filters.startFrom
        || filters.startTo
    );
}

function showEmptyState() {
    dom.grid.textContent = '';
    hideStates();
    (hasActiveQuery() ? dom.noResults : dom.empty).hidden = false;
    dom.pagination.hidden = true;
}

function showError(message) {
    dom.grid.textContent = '';
    hideStates();
    dom.errorText.textContent = message;
    dom.error.hidden = false;
    dom.pagination.hidden = true;
}

function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(totalProjects / PROJECT_PAGE_SIZE));
    if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);
    dom.pageLabel.textContent = `Página ${currentPage + 1} de ${totalPages}`;
    dom.prev.disabled = currentPage <= 0;
    dom.next.disabled = currentPage >= totalPages - 1;
    dom.pagination.hidden = totalProjects <= PROJECT_PAGE_SIZE;
}

async function refreshStats() {
    const result = await getProjectStats();
    if (!result.success) return;
    dom.totalCount.textContent = String(result.data.total);
    dom.activeCount.textContent = String(result.data.active);
}

async function loadProjects() {
    if (loading) return;
    loading = true;
    showSkeletons();
    persistState();

    const result = await listProjects({
        search: dom.search.value,
        filters: getProjectFilters(),
        sort: getProjectSort(),
        page: currentPage,
        pageSize: PROJECT_PAGE_SIZE,
    });

    loading = false;
    if (!result.success) {
        if (result.error?.includes('sesión')) window.location.href = LOGIN_URL;
        showError(result.error || 'No se pudieron cargar los proyectos.');
        return;
    }

    totalProjects = result.total;
    dom.resultsCount.textContent = `${totalProjects} ${totalProjects === 1 ? 'resultado' : 'resultados'}`;
    dom.grid.textContent = '';

    if (!result.data.length) {
        if (currentPage > 0) {
            currentPage -= 1;
            await loadProjects();
            return;
        }
        showEmptyState();
        return;
    }

    hideStates();
    result.data.forEach(project => {
        dom.grid.appendChild(createProjectCard(project, {
            onOpen: handleOpenProject,
            onEdit: handleEditProject,
            onTogglePinned: handleTogglePinned,
            onArchive: handleArchiveProject,
            onDelete: requestDelete,
            onOpenUrl: openExternalUrl,
            onCopyUrl: handleCopyProjectUrl,
        }));
    });
    updatePagination();
}

function openExternalUrl(url) {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function projectPreferredUrl(project) {
    if (project.production_url) return project.production_url;
    if (project.testing_url) return project.testing_url;
    if (project.repository_url) return project.repository_url;
    if (project.domain) return `https://${project.domain}`;
    return '';
}

async function handleCopyProjectUrl(project) {
    const value = projectPreferredUrl(project);
    if (!value) {
        showCopyToast('El proyecto no tiene un enlace para copiar', 'error');
        return;
    }
    await copyToClipboard(value);
}

async function handleOpenProject(projectId) {
    currentDetailId = projectId;
    const [projectResult, summaryResult] = await Promise.all([
        getProject(projectId),
        getProjectModuleSummary(projectId),
    ]);

    if (!projectResult.success) {
        showCopyToast(projectResult.error || 'No se pudo abrir el proyecto', 'error');
        return;
    }
    showProjectDetail(projectResult.data, summaryResult.data || {});
}

async function handleEditProject(projectId) {
    closeProjectDetail();
    currentDetailId = null;
    const result = await getProject(projectId);
    if (!result.success) {
        showCopyToast(result.error || 'No se pudo cargar el proyecto', 'error');
        return;
    }
    openProjectEdit(result.data);
}

async function handleTogglePinned(projectId, currentValue) {
    const result = await toggleProjectPinned(projectId, currentValue);
    if (!result.success) {
        showCopyToast(result.error || 'No se pudo actualizar el proyecto', 'error');
        return;
    }
    showCopyToast(result.data.is_pinned ? 'Proyecto agregado a favoritos' : 'Proyecto eliminado de favoritos');
    await Promise.all([loadProjects(), refreshStats()]);
    if (currentDetailId === projectId) await handleOpenProject(projectId);
}

async function handleArchiveProject(projectId, archived) {
    const result = await setProjectArchived(projectId, archived);
    if (!result.success) {
        showCopyToast(result.error || 'No se pudo actualizar el proyecto', 'error');
        return;
    }
    closeProjectDetail();
    currentDetailId = null;
    showCopyToast(archived ? 'Proyecto archivado' : 'Proyecto restaurado');
    await Promise.all([loadProjects(), refreshStats()]);
}

async function saveProject({ mode, projectId, project, technologyIds }) {
    const result = mode === 'edit'
        ? await updateProject(projectId, project, technologyIds)
        : await createProject(project, technologyIds);

    if (!result.success) return result;
    showCopyToast(mode === 'edit' ? 'Proyecto actualizado' : 'Proyecto creado');
    currentPage = 0;
    await Promise.all([loadProjects(), refreshStats()]);
    return result;
}

async function createTechnologyFromForm(input) {
    const result = await createTechnology(input);
    if (!result.success) return result;
    const refreshed = await listTechnologies();
    if (refreshed.success) {
        technologies = refreshed.data;
        updateTechnologyFilter(technologies);
        updateProjectFormTechnologies(technologies);
    }
    return { ...result, technologies };
}

function requestDelete(projectId, projectName) {
    closeProjectDetail();
    closeProjectForm();
    currentDetailId = null;
    pendingDelete = { id: projectId, name: projectName };
    document.getElementById('project-delete-name').textContent = projectName;
    document.getElementById('project-delete-overlay').classList.add('project-confirm--visible');
    setTimeout(() => document.getElementById('project-delete-cancel').focus(), 100);
}

function closeDeleteModal() {
    document.getElementById('project-delete-overlay').classList.remove('project-confirm--visible');
    pendingDelete = null;
}

async function confirmDeleteProject() {
    if (!pendingDelete) return;
    const button = document.getElementById('project-delete-confirm');
    button.disabled = true;
    button.textContent = 'Eliminando...';
    const result = await deleteProject(pendingDelete.id);
    button.disabled = false;
    button.textContent = 'Eliminar';

    if (!result.success) {
        showCopyToast(result.error || 'No se pudo eliminar el proyecto', 'error');
        return;
    }
    showCopyToast('Proyecto eliminado');
    closeDeleteModal();
    await Promise.all([loadProjects(), refreshStats()]);
}

function bindEvents() {
    document.getElementById('new-project-btn').addEventListener('click', openProjectCreate);
    document.getElementById('empty-create-project').addEventListener('click', openProjectCreate);
    document.getElementById('projects-retry').addEventListener('click', loadProjects);

    const debouncedSearch = debounce(() => {
        currentPage = 0;
        loadProjects();
    }, 350);
    dom.search.addEventListener('input', debouncedSearch);

    dom.filterToggle.addEventListener('click', () => {
        const open = dom.filters.classList.toggle('project-filters--visible');
        dom.filterToggle.setAttribute('aria-expanded', String(open));
    });

    dom.prev.addEventListener('click', () => {
        if (currentPage <= 0) return;
        currentPage -= 1;
        loadProjects();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    dom.next.addEventListener('click', () => {
        const totalPages = Math.ceil(totalProjects / PROJECT_PAGE_SIZE);
        if (currentPage >= totalPages - 1) return;
        currentPage += 1;
        loadProjects();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    dom.gridView.addEventListener('click', () => applyView('grid'));
    dom.listView.addEventListener('click', () => applyView('compact'));

    document.getElementById('project-delete-cancel').addEventListener('click', closeDeleteModal);
    document.getElementById('project-delete-confirm').addEventListener('click', confirmDeleteProject);
    document.getElementById('project-delete-overlay').addEventListener('click', event => {
        if (event.target.id === 'project-delete-overlay') closeDeleteModal();
    });

    // Un solo listener global evita acumular un listener por cada tarjeta renderizada.
    document.addEventListener('click', event => {
        document.querySelectorAll('.project-card__menu:not([hidden])').forEach(menu => {
            const wrapper = menu.closest('.project-card__menu-wrapper');
            if (wrapper?.contains(event.target)) return;
            menu.hidden = true;
            wrapper?.querySelector('.project-card__menu-button')?.setAttribute('aria-expanded', 'false');
        });
    });
}

async function init() {
    const { session } = await getSession();
    if (!session) {
        window.location.href = LOGIN_URL;
        return;
    }
    currentUser = session.user;

    onAuthStateChange((event, nextSession) => {
        if (event === 'SIGNED_OUT' || !nextSession) window.location.href = LOGIN_URL;
    });

    bindNavigation();

    const technologyResult = await listTechnologies();
    technologies = technologyResult.success ? technologyResult.data : [];

    initProjectFilters({
        technologies,
        onChange: () => {
            currentPage = 0;
            loadProjects();
        },
    });
    restorePageState();

    initProjectForm({
        technologies,
        onSave: saveProject,
        onCreateTechnology: createTechnologyFromForm,
    });
    initProjectDetail({
        onEdit: handleEditProject,
        onTogglePinned: handleTogglePinned,
        onArchive: handleArchiveProject,
        onDelete: requestDelete,
    });
    bindEvents();

    // API pública mínima para altas rápidas desde futuros módulos de DevHub.
    window.DevHubProjects = Object.freeze({
        openCreate: openProjectCreate,
        openQuickCreate: openProjectQuickCreate,
        refresh: loadProjects,
    });

    hideLoader();
    dom.main.style.display = '';
    await Promise.all([loadProjects(), refreshStats()]);

    // Enlaces profundos para integrar Proyectos con otros módulos.
    const route = new URLSearchParams(window.location.search);
    const projectToOpen = route.get('open');
    if (projectToOpen) await handleOpenProject(projectToOpen);
    else if (route.get('new') === 'quick') openProjectQuickCreate();
    else if (route.get('new') === '1') openProjectCreate();
}

document.addEventListener('DOMContentLoaded', init);
