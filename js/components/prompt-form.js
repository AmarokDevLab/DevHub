/* ============================================================
   DEVHUB — COMPONENTE: FORMULARIO DE PROMPT
   ============================================================
   Drawer lateral para crear/editar prompts con secciones
   colapsables, validación de JSON, upload de imágenes y
   creación inline de categorías/etiquetas.
   ============================================================ */

import { PROMPT_TYPES } from '../services/prompts-service.js';
import { createCategory } from '../services/categories-service.js';
import { createTag } from '../services/tags-service.js';
import { validateJSON, formatJSON, prepareJSONForDB } from '../utils/json-utils.js';
import { showCopyToast } from '../utils/clipboard.js';

/* ---- ESTADO INTERNO ---- */

let isOpen = false;
let isEditing = false;
let editingPromptId = null;
let currentUserId = null;
let onSaveCallback = null;
let onCloseCallback = null;
let availableCategories = [];
let availableTags = [];
let selectedCategoryIds = [];
let selectedTagIds = [];
let isSaving = false;

/* ---- API PÚBLICA ---- */

/**
 * Inicializa el formulario.
 * @param {object} options
 * @param {string}   options.userId     - UUID del usuario.
 * @param {Function} options.onSave     - Callback tras guardar.
 * @param {Function} options.onClose    - Callback al cerrar.
 * @param {Array}    options.categories - Categorías disponibles.
 * @param {Array}    options.tags       - Etiquetas disponibles.
 * @param {Array}    options.providers  - Proveedores para autocompletado.
 * @param {Array}    options.models     - Modelos para autocompletado.
 */
export function initForm({ userId, onSave, onClose, categories = [], tags = [], providers = [], models = [] }) {
    currentUserId = userId;
    onSaveCallback = onSave;
    onCloseCallback = onClose;
    availableCategories = categories;
    availableTags = tags;

    populateTypeSelect();
    populateDatalist('form-provider-list', providers);
    populateDatalist('form-model-list', models);

    bindFormEvents();
    renderCategorySelector();
    renderTagSelector();
}

/**
 * Actualiza las opciones de categorías y etiquetas.
 */
export function updateFormOptions({ categories = [], tags = [], providers = [], models = [] }) {
    availableCategories = categories;
    availableTags = tags;
    populateDatalist('form-provider-list', providers);
    populateDatalist('form-model-list', models);
    renderCategorySelector();
    renderTagSelector();
}

/**
 * Abre el drawer para crear un nuevo prompt.
 */
export function openForCreate() {
    resetForm();
    isEditing = false;
    editingPromptId = null;

    const title = document.getElementById('form-drawer-title');
    if (title) title.textContent = 'Nuevo prompt';

    const saveBtn = document.getElementById('form-save-btn');
    if (saveBtn) {
        const span = saveBtn.querySelector('span:first-child');
        if (span) span.textContent = 'Guardar prompt';
    }

    openDrawer();
}

/**
 * Abre el drawer para editar un prompt existente.
 * @param {object} prompt     - Datos del prompt.
 * @param {Array}  categories - Categorías enlazadas.
 * @param {Array}  tags       - Etiquetas enlazadas.
 */
export function openForEdit(prompt, categories = [], tags = []) {
    resetForm();
    isEditing = true;
    editingPromptId = prompt.id;

    const title = document.getElementById('form-drawer-title');
    if (title) title.textContent = 'Editar prompt';

    const saveBtn = document.getElementById('form-save-btn');
    if (saveBtn) {
        const span = saveBtn.querySelector('span:first-child');
        if (span) span.textContent = 'Actualizar prompt';
    }

    /* Rellenar campos */
    setFieldValue('form-title', prompt.title);
    setFieldValue('form-type', prompt.prompt_type);
    setFieldValue('form-prompt-text', prompt.prompt_text);
    setFieldValue('form-negative-prompt', prompt.negative_prompt || '');
    setFieldValue('form-provider', prompt.provider || '');
    setFieldValue('form-model', prompt.model_name || '');
    setFieldValue('form-json', prompt.json_content ? JSON.stringify(prompt.json_content, null, 2) : '');
    setFieldValue('form-result-text', prompt.result_text || '');
    setFieldValue('form-notes', prompt.notes || '');
    setFieldValue('form-version', prompt.version || '1');

    /* Imágenes (URLs) */
    setFieldValue('form-reference-image', prompt.reference_image_path || '');
    setFieldValue('form-result-image', prompt.result_image_path || '');
    updateImagePreview('reference', prompt.reference_image_path);
    updateImagePreview('result', prompt.result_image_path);

    /* Categorías y etiquetas */
    selectedCategoryIds = categories.map((c) => c.id);
    selectedTagIds = tags.map((t) => t.id);
    renderCategorySelector();
    renderTagSelector();

    openDrawer();
}

/**
 * Cierra el drawer.
 */
export function closeDrawer() {
    const drawer = document.getElementById('form-drawer');
    const overlay = document.getElementById('form-drawer-overlay');
    if (drawer) {
        drawer.classList.remove('prompt-drawer--open');
        drawer.setAttribute('aria-hidden', 'true');
    }
    if (overlay) overlay.classList.remove('prompt-drawer-overlay--visible');
    isOpen = false;
    document.body.style.overflow = '';
    if (onCloseCallback) onCloseCallback();
}

/* ---- INTERNOS ---- */

function openDrawer() {
    const drawer = document.getElementById('form-drawer');
    const overlay = document.getElementById('form-drawer-overlay');
    if (drawer) {
        drawer.classList.add('prompt-drawer--open');
        drawer.setAttribute('aria-hidden', 'false');
    }
    if (overlay) overlay.classList.add('prompt-drawer-overlay--visible');
    isOpen = true;
    document.body.style.overflow = 'hidden';

    /* Focus en el título */
    setTimeout(() => {
        const titleInput = document.getElementById('form-title');
        if (titleInput) titleInput.focus();
    }, 300);
}

function resetForm() {
    const fields = [
        'form-title', 'form-type', 'form-prompt-text', 'form-negative-prompt',
        'form-provider', 'form-model', 'form-json', 'form-result-text',
        'form-notes', 'form-version',
    ];
    fields.forEach((id) => setFieldValue(id, id === 'form-version' ? '1' : ''));

    selectedCategoryIds = [];
    selectedTagIds = [];
    isSaving = false;
    
    setFieldValue('form-reference-image', '');
    setFieldValue('form-result-image', '');

    clearImagePreview('reference');
    clearImagePreview('result');
    clearJsonErrors();
    clearFormErrors();
}

function bindFormEvents() {
    /* Cerrar drawer */
    const closeBtn = document.getElementById('form-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    const overlay = document.getElementById('form-drawer-overlay');
    if (overlay) overlay.addEventListener('click', closeDrawer);

    /* Escape para cerrar */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closeDrawer();
    });

    /* Submit */
    const form = document.getElementById('prompt-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSave();
        });
    }

    /* JSON editor buttons */
    const formatBtn = document.getElementById('json-format-btn');
    if (formatBtn) {
        formatBtn.addEventListener('click', () => {
            const textarea = document.getElementById('form-json');
            if (!textarea) return;
            const result = formatJSON(textarea.value);
            if (result.success) {
                textarea.value = result.formatted;
                clearJsonErrors();
            } else {
                showJsonError(result.error);
            }
        });
    }

    const clearJsonBtn = document.getElementById('json-clear-btn');
    if (clearJsonBtn) {
        clearJsonBtn.addEventListener('click', () => {
            const textarea = document.getElementById('form-json');
            if (textarea) textarea.value = '';
            clearJsonErrors();
        });
    }

    const copyJsonBtn = document.getElementById('json-copy-btn');
    if (copyJsonBtn) {
        copyJsonBtn.addEventListener('click', async () => {
            const textarea = document.getElementById('form-json');
            if (textarea && textarea.value.trim()) {
                const { copyToClipboard } = await import('../utils/clipboard.js');
                await copyToClipboard(textarea.value);
            }
        });
    }

    /* Image URLs previews */
    bindUrlPreview('reference');
    bindUrlPreview('result');

    /* Secciones colapsables */
    document.querySelectorAll('.form-section__toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const section = btn.closest('.form-section');
            if (section) {
                section.classList.toggle('form-section--collapsed');
                const expanded = !section.classList.contains('form-section--collapsed');
                btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            }
        });
    });

    /* Crear categoría inline */
    const addCatBtn = document.getElementById('add-category-btn');
    if (addCatBtn) {
        addCatBtn.addEventListener('click', async () => {
            const input = document.getElementById('new-category-input');
            if (!input || !input.value.trim()) return;

            const result = await createCategory(input.value, currentUserId);
            if (result.success) {
                availableCategories.push(result.data);
                selectedCategoryIds.push(result.data.id);
                input.value = '';
                renderCategorySelector();
                showCopyToast('Categoría creada');
            } else {
                showCopyToast(result.error, 'error');
            }
        });
    }

    /* Crear etiqueta inline */
    const addTagBtn = document.getElementById('add-tag-btn');
    if (addTagBtn) {
        addTagBtn.addEventListener('click', async () => {
            const input = document.getElementById('new-tag-input');
            if (!input || !input.value.trim()) return;

            const result = await createTag(input.value, currentUserId);
            if (result.success) {
                availableTags.push(result.data);
                selectedTagIds.push(result.data.id);
                input.value = '';
                renderTagSelector();
                showCopyToast('Etiqueta creada');
            } else {
                showCopyToast(result.error, 'error');
            }
        });
    }
}

/* ---- SAVE ---- */

async function handleSave() {
    if (isSaving) return;
    clearFormErrors();

    /* Validaciones */
    const title = getFieldValue('form-title');
    const promptType = getFieldValue('form-type');
    const promptText = getFieldValue('form-prompt-text');

    if (!title.trim()) {
        showFieldError('form-title', 'El título es obligatorio.');
        return;
    }
    if (title.trim().length > 200) {
        showFieldError('form-title', 'El título no puede exceder 200 caracteres.');
        return;
    }
    if (!promptType) {
        showFieldError('form-type', 'Selecciona un tipo de prompt.');
        return;
    }
    if (!promptText.trim()) {
        showFieldError('form-prompt-text', 'El prompt principal es obligatorio.');
        return;
    }

    /* Validar JSON */
    const jsonStr = getFieldValue('form-json');
    if (jsonStr.trim()) {
        const jsonValidation = validateJSON(jsonStr);
        if (!jsonValidation.valid) {
            showJsonError(jsonValidation.error, jsonValidation.line);
            return;
        }
    }

    isSaving = true;
    const saveBtn = document.getElementById('form-save-btn');
    if (saveBtn) saveBtn.disabled = true;
    const spinner = saveBtn?.querySelector('.spinner-border');
    if (spinner) spinner.classList.remove('d-none');

    try {
        /* Preparar datos */
        const promptData = {
            title,
            prompt_type: promptType,
            prompt_text: promptText,
            negative_prompt: getFieldValue('form-negative-prompt') || null,
            provider: getFieldValue('form-provider') || null,
            model_name: getFieldValue('form-model') || null,
            json_content: prepareJSONForDB(jsonStr),
            result_text: getFieldValue('form-result-text') || null,
            notes: getFieldValue('form-notes') || null,
            version: getFieldValue('form-version') || '1',
            reference_image_path: getFieldValue('form-reference-image') || null,
            result_image_path: getFieldValue('form-result-image') || null,
        };

        let promptId = editingPromptId;

        if (!isEditing) {
            const { createPrompt } = await import('../services/prompts-service.js');
            const result = await createPrompt(promptData, selectedCategoryIds, selectedTagIds, currentUserId);
            if (!result.success) {
                showCopyToast(result.error, 'error');
                return;
            }
            promptId = result.data.id;
        } else {
            const { updatePrompt } = await import('../services/prompts-service.js');
            const result = await updatePrompt(promptId, promptData, selectedCategoryIds, selectedTagIds, currentUserId);
            if (!result.success) {
                showCopyToast(result.error, 'error');
                return;
            }
        }

        showCopyToast(isEditing ? 'Prompt actualizado' : 'Prompt creado');
        closeDrawer();
        if (onSaveCallback) onSaveCallback(promptId);
    } catch (err) {
        console.error('Error al guardar prompt:', err);
        showCopyToast('Error al guardar el prompt', 'error');
    } finally {
        isSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
}

/* ---- CATEGORÍAS / ETIQUETAS SELECTOR ---- */

function renderCategorySelector() {
    const container = document.getElementById('category-chips-container');
    if (!container) return;

    container.textContent = '';
    availableCategories.forEach((cat) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip-selector';
        if (selectedCategoryIds.includes(cat.id)) {
            chip.classList.add('chip-selector--selected');
        }
        chip.textContent = cat.name;
        chip.setAttribute('aria-pressed', selectedCategoryIds.includes(cat.id) ? 'true' : 'false');

        chip.addEventListener('click', () => {
            const idx = selectedCategoryIds.indexOf(cat.id);
            if (idx >= 0) {
                selectedCategoryIds.splice(idx, 1);
                chip.classList.remove('chip-selector--selected');
                chip.setAttribute('aria-pressed', 'false');
            } else {
                selectedCategoryIds.push(cat.id);
                chip.classList.add('chip-selector--selected');
                chip.setAttribute('aria-pressed', 'true');
            }
        });

        container.appendChild(chip);
    });
}

function renderTagSelector() {
    const container = document.getElementById('tag-chips-container');
    if (!container) return;

    container.textContent = '';
    availableTags.forEach((tag) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip-selector chip-selector--tag';
        if (selectedTagIds.includes(tag.id)) {
            chip.classList.add('chip-selector--selected');
        }
        chip.textContent = tag.name;
        chip.setAttribute('aria-pressed', selectedTagIds.includes(tag.id) ? 'true' : 'false');

        chip.addEventListener('click', () => {
            const idx = selectedTagIds.indexOf(tag.id);
            if (idx >= 0) {
                selectedTagIds.splice(idx, 1);
                chip.classList.remove('chip-selector--selected');
                chip.setAttribute('aria-pressed', 'false');
            } else {
                selectedTagIds.push(tag.id);
                chip.classList.add('chip-selector--selected');
                chip.setAttribute('aria-pressed', 'true');
            }
        });

        container.appendChild(chip);
    });
}

/* ---- IMÁGENES ---- */

function bindUrlPreview(type) {
    const input = document.getElementById(`form-${type}-image`);

    if (input) {
        input.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                updateImagePreview(type, url);
            } else {
                clearImagePreview(type);
            }
        });
    }
}

function updateImagePreview(type, url) {
    const preview = document.getElementById(`${type}-image-preview`);
    if (!preview) return;

    if (!url) {
        clearImagePreview(type);
        return;
    }

    preview.textContent = '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Imagen ${type === 'reference' ? 'de referencia' : 'de resultado'}`;
    img.className = 'image-upload-preview__img';
    
    // Handle invalid URLs gracefully
    img.onerror = () => {
        preview.textContent = '';
        const errorText = document.createElement('span');
        errorText.className = 'text-muted small';
        errorText.textContent = 'No se pudo cargar la imagen desde la URL proporcionada.';
        preview.appendChild(errorText);
        preview.style.display = 'block';
    };

    img.onload = () => {
        preview.style.display = 'block';
    };

    preview.appendChild(img);
}

function clearImagePreview(type) {
    const preview = document.getElementById(`${type}-image-preview`);
    if (preview) {
        preview.textContent = '';
        preview.style.display = 'none';
    }
    const removeBtn = document.getElementById(`remove-${type}-image-btn`);
    if (removeBtn) removeBtn.style.display = 'none';
}

/* ---- JSON ERRORS ---- */

function showJsonError(message, line) {
    const errorEl = document.getElementById('json-error');
    if (!errorEl) return;
    let text = message;
    if (line) text = `Línea ${line}: ${message}`;
    errorEl.textContent = text;
    errorEl.style.display = 'block';
}

function clearJsonErrors() {
    const errorEl = document.getElementById('json-error');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

/* ---- FORM ERRORS ---- */

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('is-invalid');
        const errorEl = field.parentElement.querySelector('.invalid-feedback') ||
            field.closest('.clay-input-wrapper')?.querySelector('.invalid-feedback');
        if (errorEl) errorEl.textContent = message;

        field.focus();
    }
}

function clearFormErrors() {
    document.querySelectorAll('#prompt-form .is-invalid').forEach((el) => {
        el.classList.remove('is-invalid');
    });
}

/* ---- HELPERS ---- */

function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function getFieldValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function populateTypeSelect() {
    const select = document.getElementById('form-type');
    if (!select) return;

    /* Mantener placeholder */
    const first = select.querySelector('option:first-child');
    select.textContent = '';
    if (first) select.appendChild(first);

    PROMPT_TYPES.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.value;
        opt.textContent = t.label;
        select.appendChild(opt);
    });
}

function populateDatalist(id, values) {
    const datalist = document.getElementById(id);
    if (!datalist) return;

    datalist.textContent = '';
    (values || []).forEach((val) => {
        const opt = document.createElement('option');
        opt.value = val;
        datalist.appendChild(opt);
    });
}
