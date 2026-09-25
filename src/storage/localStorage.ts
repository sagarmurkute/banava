import type { DocumentModel, ViewportState } from '../types/document';
import { createDefaultDocument, CURRENT_DOCUMENT_VERSION } from '../document/defaultDocument';

const STORAGE_KEY_DOC = 'sagar_design_document_v2';
const STORAGE_KEY_VIEWPORT = 'sagar_design_viewport_v2';

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function saveDocumentToStorage(
  doc: DocumentModel,
  onStatusChange?: (status: 'saving' | 'saved' | 'error') => void
): void {
  if (onStatusChange) onStatusChange('saving');

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    try {
      const sanitizedDoc: DocumentModel = {
        ...doc,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY_DOC, JSON.stringify(sanitizedDoc));
      if (onStatusChange) onStatusChange('saved');
    } catch (err) {
      console.error('Failed to save document to localStorage:', err);
      if (onStatusChange) onStatusChange('error');
    }
  }, 400);
}

export function saveDocumentImmediate(doc: DocumentModel): boolean {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  try {
    const sanitizedDoc: DocumentModel = {
      ...doc,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_DOC, JSON.stringify(sanitizedDoc));
    return true;
  } catch (err) {
    console.error('Immediate save failed:', err);
    return false;
  }
}

export function loadDocumentFromStorage(): DocumentModel {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_DOC);
    if (!raw) {
      // Check for v1 migration
      raw = localStorage.getItem('sagar_design_document_v1');
    }
    if (!raw) return createDefaultDocument();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultDocument();
    }

    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return createDefaultDocument();
    }

    if (!parsed.assets || typeof parsed.assets !== 'object') {
      parsed.assets = {};
    }

    parsed.version = CURRENT_DOCUMENT_VERSION;

    if (!parsed.activePageId || !parsed.pages.some((p: { id: string }) => p.id === parsed.activePageId)) {
      parsed.activePageId = parsed.pages[0].id;
    }

    return parsed as DocumentModel;
  } catch (err) {
    console.warn('Error loading document from storage, recovering with default template:', err);
    return createDefaultDocument();
  }
}

export function saveViewportToStorage(viewport: ViewportState): void {
  try {
    localStorage.setItem(STORAGE_KEY_VIEWPORT, JSON.stringify(viewport));
  } catch (err) {
    console.error('Failed to save viewport to localStorage:', err);
  }
}

export function loadViewportFromStorage(): ViewportState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_VIEWPORT);
    if (!raw) {
      raw = localStorage.getItem('sagar_design_viewport_v1');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        typeof parsed.zoom === 'number' &&
        parsed.zoom > 0.05 &&
        parsed.zoom < 30
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error loading viewport from localStorage:', err);
  }

  return {
    x: 200,
    y: 80,
    zoom: 1.0,
  };
}
