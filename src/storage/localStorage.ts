import type { DocumentModel, ViewportState } from '../types/document';
import { createDefaultDocument } from '../document/defaultDocument';
import { SchemaMigrationManager } from '../documents/migration';
import { defaultStorageProvider } from './storageProvider';
import { RecoveryEngine } from './recoveryEngine';

const STORAGE_KEY_DOC = 'sagar_design_document_v2';
const STORAGE_KEY_VIEWPORT = 'sagar_design_viewport_v2';

export function saveDocumentToStorage(
  doc: DocumentModel,
  onStatusChange?: (status: 'saving' | 'saved' | 'error' | 'unsaved') => void
): void {
  RecoveryEngine.queueAutoSave(doc, onStatusChange as any, 500);
}

export function saveDocumentImmediate(doc: DocumentModel): boolean {
  return defaultStorageProvider.saveDocument(doc) as any;
}

export function loadDocumentFromStorage(): DocumentModel {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_DOC);
    if (!raw) {
      raw = localStorage.getItem('sagar_design_document_v1');
    }
    if (!raw) {
      const defaultDoc = createDefaultDocument();
      defaultStorageProvider.saveDocument(defaultDoc);
      return defaultDoc;
    }

    const parsed = JSON.parse(raw);
    const { document: migratedDoc } = SchemaMigrationManager.migrate(parsed);
    return migratedDoc;
  } catch (err) {
    console.error('Failed to load document from storage, creating default:', err);
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

export function loadViewportFromStorage(): ViewportState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIEWPORT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
