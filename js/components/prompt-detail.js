/* ============================================================
   DEVHUB — COMPONENTE: DETALLE DE PROMPT
   ============================================================
   Panel lateral / vista completa que muestra todos los campos
   de un prompt con botones de copia accesibles.
   ============================================================ */

import { copyToClipboard } from '../utils/clipboard.js';
import { PROMPT_TYPES } from '../services/prompts-service.js';

/* ---- ESTADO ---- */

let isOpen = false;
let onEditCallback = null;
let onDuplicateCallback = null;
let onDeleteCallback = null;
let onCloseCallback = null;

/**
 * Inicializa el panel de detalle.
 * @param {object} options
 * @param {Function} options.onEdit
 * @param {Function} options.onDuplicate
 * @param {Function} options.onDelete
 * @param {Function} options.onClose
 */
export function initDetail({ onEdit, onDuplicate, onDelete, onClose }) {
    onEditCallback = onEdit;
    onDuplicateCallback = onDuplicate;
    onDeleteCallback = onDelete;
    onCloseCallback = onClose;

    const closeBtn = document.getElementById('detail-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeDetail);

    const overlay = document.getElementById('detail-overlay');
    if (overlay) overlay.addEventListener('click', closeDetail);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closeDetail();
    });

    /* Action buttons */
    const editBtn = document.getElementById('detail-edit-btn');
    if (editBtn) editBtn.addEventListener('click', () => {
        if (onEditCallback && currentPromptId) onEditCallback(currentPromptId);
    });

    const dupBtn = document.getElementById('detail-duplicate-btn');
    if (dupBtn) dupBtn.addEventListener('click', () => {
        if (onDuplicateCallback && currentPromptId) onDuplicateCallback(currentPromptId);
    });

    const delBtn = document.getElementById('detail-delete-btn');
    if (delBtn) delBtn.addEventListener('click', () => {
        if (onDeleteCallback && currentPromptId) onDeleteCallback(currentPromptId, currentPromptTitle);
    });

    /* Copy buttons */
    document.getElementById('copy-prompt-btn')?.addEventListener('click', () => {
        const el = document.getElementById('detail-prompt-text');
        if (el) copyToClipboard(el.textContent);
    });
    document.getElementById('copy-negative-btn')?.addEventListener('click', () => {
        const el = document.getElementById('detail-negative-text');
        if (el) copyToClipboard(el.textContent);
    });
    document.getElementById('copy-json-btn')?.addEventListener('click', () => {
        const el = document.getElementById('detail-json-text');
        if (el) copyToClipboard(el.textContent);
    });
    document.getElementById('copy-result-btn')?.addEventListener('click', () => {
        const el = document.getElementById('detail-result-text');
        if (el) copyToClipboard(el.textContent);
    });
    document.getElementById('copy-all-btn')?.addEventListener('click', () => {
        copyAllContent();
    });
}

let currentPromptId = null;
let currentPromptTitle = '';

/**
 * Muestra el panel de detalle con los datos del prompt.
 * @param {object} prompt - Prompt con categorías y etiquetas.
 */
export async function showDetail(prompt) {
    currentPromptId = prompt.id;
    currentPromptTitle = prompt.title;

    /* Título */
    setTextContent('detail-title', prompt.title);

    /* Tipo */
    const typeLabel = PROMPT_TYPES.find((t) => t.value === prompt.prompt_type)?.label || prompt.prompt_type;
    const typeEl = document.getElementById('detail-type');
    if (typeEl) {
        typeEl.textContent = typeLabel;
        typeEl.className = `prompt-type-badge prompt-type-badge--${prompt.prompt_type}`;
    }

    /* Proveedor + Modelo */
    const provModelParts = [prompt.provider, prompt.model_name].filter(Boolean);
    setTextContent('detail-provider-model', provModelParts.join(' · ') || '—');

    /* Prompt principal */
    setTextContent('detail-prompt-text', prompt.prompt_text);
    toggleSection('detail-prompt-section', true);

    /* Prompt negativo */
    if (prompt.negative_prompt) {
        setTextContent('detail-negative-text', prompt.negative_prompt);
        toggleSection('detail-negative-section', true);
    } else {
        toggleSection('detail-negative-section', false);
    }

    /* JSON */
    if (prompt.json_content) {
        const formatted = JSON.stringify(prompt.json_content, null, 2);
        setTextContent('detail-json-text', formatted);
        toggleSection('detail-json-section', true);
    } else {
        toggleSection('detail-json-section', false);
    }

    /* Resultado */
    if (prompt.result_text) {
        setTextContent('detail-result-text', prompt.result_text);
        toggleSection('detail-result-section', true);
    } else {
        toggleSection('detail-result-section', false);
    }

    /* Notas */
    if (prompt.notes) {
        setTextContent('detail-notes-text', prompt.notes);
        toggleSection('detail-notes-section', true);
    } else {
        toggleSection('detail-notes-section', false);
    }

    /* Versión */
    setTextContent('detail-version', `v${prompt.version}`);

    /* Fechas */
    setTextContent('detail-created', formatDateLong(prompt.created_at));
    setTextContent('detail-updated', formatDateLong(prompt.updated_at));
    setTextContent('detail-last-used', prompt.last_used_at ? formatDateLong(prompt.last_used_at) : 'Nunca');

    /* Categorías */
    const catContainer = document.getElementById('detail-categories');
    if (catContainer) {
        catContainer.textContent = '';
        if (prompt.categories && prompt.categories.length > 0) {
            prompt.categories.forEach((cat) => {
                const pill = document.createElement('span');
                pill.className = 'prompt-card__cat-pill';
                if (cat.color) {
                    pill.style.borderColor = cat.color;
                    pill.style.color = cat.color;
                }
                pill.textContent = cat.name;
                catContainer.appendChild(pill);
            });
            catContainer.parentElement.style.display = '';
        } else {
            catContainer.parentElement.style.display = 'none';
        }
    }

    /* Etiquetas */
    const tagContainer = document.getElementById('detail-tags');
    if (tagContainer) {
        tagContainer.textContent = '';
        if (prompt.tags && prompt.tags.length > 0) {
            prompt.tags.forEach((tag) => {
                const chip = document.createElement('span');
                chip.className = 'prompt-card__tag-chip';
                chip.textContent = tag.name;
                tagContainer.appendChild(chip);
            });
            tagContainer.parentElement.style.display = '';
        } else {
            tagContainer.parentElement.style.display = 'none';
        }
    }

    /* Imágenes */
    await loadDetailImage('detail-reference-img', prompt.reference_image_path, 'Imagen de referencia');
    await loadDetailImage('detail-result-img', prompt.result_image_path, 'Imagen de resultado');

    openDetailPanel();
}

/**
 * Cierra el panel de detalle.
 */
export function closeDetail() {
    const panel = document.getElementById('detail-panel');
    const overlay = document.getElementById('detail-overlay');
    if (panel) {
        panel.classList.remove('detail-panel--open');
        panel.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('detail-overlay--visible');
    isOpen = false;
    document.body.style.overflow = '';
    if (onCloseCallback) onCloseCallback();
}

/* ---- INTERNOS ---- */

function openDetailPanel() {
    const panel = document.getElementById('detail-panel');
    const overlay = document.getElementById('detail-overlay');
    if (panel) {
        panel.classList.add('detail-panel--open');
        panel.setAttribute('aria-hidden', 'false');
    }
    if (overlay) overlay.classList.add('detail-overlay--visible');
    isOpen = true;

    /* En mobile, prevenir scroll del body */
    if (window.innerWidth < 992) {
        document.body.style.overflow = 'hidden';
    }

    /* Focus en el panel */
    setTimeout(() => {
        const closeBtn = document.getElementById('detail-close-btn');
        if (closeBtn) closeBtn.focus();
    }, 300);
}

async function loadDetailImage(containerId, path, altText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.textContent = '';

    if (!path) {
        container.parentElement.style.display = 'none';
        return;
    }

    container.parentElement.style.display = '';

    const img = document.createElement('img');
    img.src = path;
    img.alt = altText;
    img.className = 'detail-image';
    img.loading = 'lazy';
    
    img.onerror = () => {
        container.textContent = '';
        const msg = document.createElement('span');
        msg.className = 'text-muted small';
        msg.textContent = 'No se pudo cargar la imagen desde la URL';
        container.appendChild(msg);
    };

    container.appendChild(img);
}

function copyAllContent() {
    const parts = [];

    const title = document.getElementById('detail-title')?.textContent;
    if (title) parts.push(`# ${title}`);

    const type = document.getElementById('detail-type')?.textContent;
    if (type) parts.push(`Tipo: ${type}`);

    const provModel = document.getElementById('detail-provider-model')?.textContent;
    if (provModel && provModel !== '—') parts.push(`Proveedor/Modelo: ${provModel}`);

    const prompt = document.getElementById('detail-prompt-text')?.textContent;
    if (prompt) parts.push(`\n## Prompt\n${prompt}`);

    const negative = document.getElementById('detail-negative-text')?.textContent;
    if (negative) parts.push(`\n## Prompt Negativo\n${negative}`);

    const json = document.getElementById('detail-json-text')?.textContent;
    if (json) parts.push(`\n## JSON\n\`\`\`json\n${json}\n\`\`\``);

    const result = document.getElementById('detail-result-text')?.textContent;
    if (result) parts.push(`\n## Resultado\n${result}`);

    const notes = document.getElementById('detail-notes-text')?.textContent;
    if (notes) parts.push(`\n## Notas\n${notes}`);

    copyToClipboard(parts.join('\n'));
}

function setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

function toggleSection(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? '' : 'none';
}

function formatDateLong(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}
