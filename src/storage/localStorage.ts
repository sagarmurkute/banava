import type { DocumentModel, ViewportState } from '../types/document';
import { createDefaultDocument, CURRENT_DOCUMENT_VERSION } from '../document/defaultDocument';

const STORAGE_KEY_DOC = 'sagar_design_document_v1';
const STORAGE_KEY_VIEWPORT = 'sagar_design_viewport_v1';

export function saveDocumentToStorage(doc: DocumentModel): void {
  try {
    const serialized = JSON.stringify({
      ...doc,
      updatedAt: Date.now(),
    });
    localStorage.setItem(STORAGE_KEY_DOC, serialized);
  } catch (err) {
    console.error('Failed to save document to localStorage:', err);
  }
}

export function loadDocumentFromStorage(): DocumentModel {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOC);
    if (!raw) return createDefaultDocument();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultDocument();
    }

    // Schema version check and migration hook
    if (!parsed.version || parsed.version < CURRENT_DOCUMENT_VERSION) {
      parsed.version = CURRENT_DOCUMENT_VERSION;
    }

    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return createDefaultDocument();
    }

    if (!parsed.activePageId || !parsed.pages.some((p: { id: string }) => p.id === parsed.activePageId)) {
      parsed.activePageId = parsed.pages[0].id;
    }

    return parsed as DocumentModel;
  } catch (err) {
    console.warn('Error loading document from localStorage, falling back to default:', err);
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
    const raw = localStorage.getItem(STORAGE_KEY_VIEWPORT);
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

  // Default viewport centered nicely
  return {
    x: 200,
    y: 80,
    zoom: 1.0,
  };
}
