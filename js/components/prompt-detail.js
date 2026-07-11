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
        let textToCopy = document.getElementById('detail-prompt-text')?.textContent || '';
        const negEl = document.getElementById('detail-negative-text');
        if (negEl && negEl.textContent) textToCopy += `\n\nPrompt Negativo:\n${negEl.textContent}`;
        
        const jsonPre = document.querySelector('#detail-json-text pre');
        if (jsonPre && jsonPre.textContent) textToCopy += `\n\nJSON:\n${jsonPre.textContent}`;
        
        copyToClipboard(textToCopy);
    });
    document.getElementById('copy-negative-btn')?.addEventListener('click', () => {
        const el = document.getElementById('detail-negative-text');
        if (el) copyToClipboard(el.textContent);
    });
    document.getElementById('copy-json-btn')?.addEventListener('click', () => {
        const jsonPre = document.querySelector('#detail-json-text pre');
        if (jsonPre && jsonPre.textContent) copyToClipboard(jsonPre.textContent);
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
        const container = document.getElementById('detail-json-text');
        
        container.style.whiteSpace = 'normal';
        
        if (formatted.split('\n').length > 5 || formatted.length > 200) {
            container.innerHTML = '<div class="json-content-preview" style="max-height: 100px; overflow: hidden; margin: 0; position: relative; transition: max-height 0.3s ease;">' +
                '<pre style="margin:0; font-size: 0.85rem; line-height: 1.4;">' + formatted + '</pre>' +
                '<div class="json-fade" style="position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(transparent, #fff);"></div>' +
                '</div>' +
                '<div style="text-align: center; margin-top: 0.5rem;">' +
                '<button type="button" class="btn-toggle-json" style="font-size: 0.8rem; font-weight: 600; background: none; border: none; color: var(--color-primary); cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 4px;">Ver todo el JSON</button>' +
                '</div>';
            
            const btn = container.querySelector('.btn-toggle-json');
            const preContainer = container.querySelector('.json-content-preview');
            const fade = container.querySelector('.json-fade');
            
            btn.addEventListener('click', () => {
                if (preContainer.style.maxHeight === '100px') {
                    preContainer.style.maxHeight = '2000px';
                    fade.style.display = 'none';
                    btn.textContent = 'Ocultar JSON';
                } else {
                    preContainer.style.maxHeight = '100px';
                    fade.style.display = 'block';
                    btn.textContent = 'Ver todo el JSON';
                }
            });
        } else {
            container.innerHTML = '<pre style="margin:0; font-size: 0.85rem; line-height: 1.4;">' + formatted + '</pre>';
        }
        
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
    img.alt = altText;
    img.src = path;
    img.style.cursor = 'pointer';
    img.title = 'Haz clic para ver tamaño completo';
    
    img.addEventListener('click', () => {
        let overlay = document.getElementById('img-fullscreen-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'img-fullscreen-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                zIndex: '99999', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'zoom-out'
            });
            const fullImg = document.createElement('img');
            fullImg.id = 'img-fullscreen-content';
            Object.assign(fullImg.style, {
                maxWidth: '90%', maxHeight: '90%',
                objectFit: 'contain', borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            });
            overlay.appendChild(fullImg);
            overlay.addEventListener('click', () => {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            });
            document.body.appendChild(overlay);
        }
        
        const fullImg = document.getElementById('img-fullscreen-content');
        fullImg.src = path;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

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

    const jsonPre = document.querySelector('#detail-json-text pre');
    if (jsonPre && jsonPre.textContent) parts.push(`\n## JSON\n\`\`\`json\n${jsonPre.textContent}\n\`\`\``);

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
