import type { DocumentModel } from '../types/document';
import type {
  BanavaProject,
  BanavaFolder,
  DocumentSummary,
  CrashRecoveryRecord,
} from '../documents/types';
import { BANAVA_SCHEMA_VERSION } from '../documents/types';
import { generateId } from '../utils/id';

export interface StorageProvider {
  // Document Index & Metadata
  listDocuments(): Promise<DocumentSummary[]>;
  getDocument(id: string): Promise<DocumentModel | null>;
  saveDocument(doc: DocumentModel): Promise<boolean>;
  deleteDocument(id: string, permanent?: boolean): Promise<boolean>;
  restoreDocument(id: string): Promise<boolean>;
  emptyTrash(): Promise<boolean>;
  
  // Projects & Folders
  listProjects(): Promise<BanavaProject[]>;
  saveProject(project: BanavaProject): Promise<boolean>;
  deleteProject(projectId: string): Promise<boolean>;
  
  listFolders(): Promise<BanavaFolder[]>;
  saveFolder(folder: BanavaFolder): Promise<boolean>;
  deleteFolder(folderId: string): Promise<boolean>;

  // Crash Recovery
  getRecoveryRecord(): Promise<CrashRecoveryRecord | null>;
  saveRecoveryRecord(record: CrashRecoveryRecord): Promise<void>;
  clearRecoveryRecord(): Promise<void>;
}

const STORAGE_KEY_DOC_INDEX = 'banava_document_index_v6';
const STORAGE_KEY_DOC_PREFIX = 'banava_doc_';
const STORAGE_KEY_PROJECTS = 'banava_projects_v6';
const STORAGE_KEY_FOLDERS = 'banava_folders_v6';
const STORAGE_KEY_RECOVERY = 'banava_recovery_journal_v6';
const STORAGE_KEY_ACTIVE_DOC_ID = 'banava_active_document_id';

export class LocalStorageProvider implements StorageProvider {
  public async listDocuments(): Promise<DocumentSummary[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DOC_INDEX);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('Failed to list documents from localStorage:', err);
      return [];
    }
  }

  public async getDocument(id: string): Promise<DocumentModel | null> {
    try {
      const key = `${STORAGE_KEY_DOC_PREFIX}${id}`;
      const raw = localStorage.getItem(key);
      if (!raw) {
        // Fallback check for legacy single-document keys
        if (id === 'default' || id === 'current') {
          const legacy = localStorage.getItem('sagar_design_document_v2') || localStorage.getItem('sagar_design_document_v1');
          if (legacy) return JSON.parse(legacy);
        }
        return null;
      }
      return JSON.parse(raw);
    } catch (err) {
      console.error(`Failed to get document ${id}:`, err);
      return null;
    }
  }

  public async saveDocument(doc: DocumentModel): Promise<boolean> {
    try {
      const docId = doc.id || doc.metadata?.id || generateId('doc');
      const key = `${STORAGE_KEY_DOC_PREFIX}${docId}`;

      // Update metadata on document
      const now = Date.now();
      const updatedMetadata = {
        id: docId,
        name: doc.name || doc.metadata?.name || 'Untitled Document',
        description: doc.metadata?.description || '',
        createdAt: doc.metadata?.createdAt || doc.createdAt || now,
        updatedAt: now,
        version: doc.version || 6,
        schemaVersion: BANAVA_SCHEMA_VERSION,
        author: doc.metadata?.author || 'Local User',
        thumbnail: doc.metadata?.thumbnail,
        coverNodeId: doc.metadata?.coverNodeId,
        projectId: doc.metadata?.projectId ?? null,
        folderId: doc.metadata?.folderId ?? null,
        deletedAt: doc.metadata?.deletedAt ?? null,
        isTemplate: doc.metadata?.isTemplate ?? false,
        revision: (doc.metadata?.revision || 0) + 1,
      };

      const docToSave: DocumentModel = {
        ...doc,
        id: docId,
        version: BANAVA_SCHEMA_VERSION,
        metadata: updatedMetadata,
        updatedAt: now,
      };

      const serialized = JSON.stringify(docToSave);
      localStorage.setItem(key, serialized);

      // Keep legacy active key in sync for backwards compatibility
      localStorage.setItem('sagar_design_document_v2', serialized);
      localStorage.setItem(STORAGE_KEY_ACTIVE_DOC_ID, docId);

      // Update index
      await this.updateDocumentIndex({
        id: docId,
        name: updatedMetadata.name,
        updatedAt: now,
        createdAt: updatedMetadata.createdAt,
        thumbnail: updatedMetadata.thumbnail,
        projectId: updatedMetadata.projectId,
        folderId: updatedMetadata.folderId,
        deletedAt: updatedMetadata.deletedAt,
        pageCount: doc.pages.length,
        objectCount: doc.pages.reduce((acc, p) => acc + p.objects.length, 0),
        fileSizeBytes: new Blob([serialized]).size,
      });

      return true;
    } catch (err) {
      console.error('Failed to save document:', err);
      return false;
    }
  }

  public async deleteDocument(id: string, permanent = false): Promise<boolean> {
    try {
      const index = await this.listDocuments();
      const target = index.find((d) => d.id === id);
      if (!target) return false;

      if (permanent) {
        // Remove permanently
        localStorage.removeItem(`${STORAGE_KEY_DOC_PREFIX}${id}`);
        const nextIndex = index.filter((d) => d.id !== id);
        localStorage.setItem(STORAGE_KEY_DOC_INDEX, JSON.stringify(nextIndex));
      } else {
        // Move to trash
        target.deletedAt = Date.now();
        localStorage.setItem(STORAGE_KEY_DOC_INDEX, JSON.stringify(index));

        const doc = await this.getDocument(id);
        if (doc) {
          if (doc.metadata) doc.metadata.deletedAt = target.deletedAt;
          localStorage.setItem(`${STORAGE_KEY_DOC_PREFIX}${id}`, JSON.stringify(doc));
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to delete document:', err);
      return false;
    }
  }

  public async restoreDocument(id: string): Promise<boolean> {
    try {
      const index = await this.listDocuments();
      const target = index.find((d) => d.id === id);
      if (!target) return false;

      target.deletedAt = null;
      localStorage.setItem(STORAGE_KEY_DOC_INDEX, JSON.stringify(index));

      const doc = await this.getDocument(id);
      if (doc) {
        if (doc.metadata) doc.metadata.deletedAt = null;
        localStorage.setItem(`${STORAGE_KEY_DOC_PREFIX}${id}`, JSON.stringify(doc));
      }
      return true;
    } catch (err) {
      console.error('Failed to restore document:', err);
      return false;
    }
  }

  public async emptyTrash(): Promise<boolean> {
    try {
      const index = await this.listDocuments();
      const trashed = index.filter((d) => d.deletedAt !== null);
      for (const item of trashed) {
        localStorage.removeItem(`${STORAGE_KEY_DOC_PREFIX}${item.id}`);
      }
      const retained = index.filter((d) => d.deletedAt === null);
      localStorage.setItem(STORAGE_KEY_DOC_INDEX, JSON.stringify(retained));
      return true;
    } catch (err) {
      console.error('Failed to empty trash:', err);
      return false;
    }
  }

  private async updateDocumentIndex(summary: DocumentSummary): Promise<void> {
    const list = await this.listDocuments();
    const existingIdx = list.findIndex((d) => d.id === summary.id);
    let nextList: DocumentSummary[];
    if (existingIdx >= 0) {
      nextList = [...list];
      nextList[existingIdx] = summary;
    } else {
      nextList = [summary, ...list];
    }
    // Limit recent history to 50 entries
    if (nextList.length > 50) {
      nextList = nextList.slice(0, 50);
    }
    localStorage.setItem(STORAGE_KEY_DOC_INDEX, JSON.stringify(nextList));
  }

  // Projects
  public async listProjects(): Promise<BanavaProject[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (!raw) {
        const defaultProjects: BanavaProject[] = [
          { id: 'proj_default', name: 'Website Designs', createdAt: Date.now(), updatedAt: Date.now(), color: '#6366f1' },
          { id: 'proj_mobile', name: 'Mobile Apps', createdAt: Date.now(), updatedAt: Date.now(), color: '#ec4899' },
          { id: 'proj_client', name: 'Client Work', createdAt: Date.now(), updatedAt: Date.now(), color: '#10b981' },
        ];
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(defaultProjects));
        return defaultProjects;
      }
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to list projects:', err);
      return [];
    }
  }

  public async saveProject(project: BanavaProject): Promise<boolean> {
    try {
      const list = await this.listProjects();
      const idx = list.findIndex((p) => p.id === project.id);
      const nextList = idx >= 0 ? list.map((p, i) => (i === idx ? project : p)) : [...list, project];
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(nextList));
      return true;
    } catch (err) {
      console.error('Failed to save project:', err);
      return false;
    }
  }

  public async deleteProject(projectId: string): Promise<boolean> {
    try {
      const list = await this.listProjects();
      const nextList = list.filter((p) => p.id !== projectId);
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(nextList));
      return true;
    } catch (err) {
      console.error('Failed to delete project:', err);
      return false;
    }
  }

  // Folders
  public async listFolders(): Promise<BanavaFolder[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FOLDERS);
      if (!raw) {
        const defaultFolders: BanavaFolder[] = [
          { id: 'folder_landing', projectId: 'proj_default', parentId: null, name: 'Landing Pages', createdAt: Date.now(), updatedAt: Date.now() },
          { id: 'folder_mobile_ios', projectId: 'proj_mobile', parentId: null, name: 'iOS Screens', createdAt: Date.now(), updatedAt: Date.now() },
        ];
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(defaultFolders));
        return defaultFolders;
      }
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to list folders:', err);
      return [];
    }
  }

  public async saveFolder(folder: BanavaFolder): Promise<boolean> {
    try {
      const list = await this.listFolders();
      const idx = list.findIndex((f) => f.id === folder.id);
      const nextList = idx >= 0 ? list.map((f, i) => (i === idx ? folder : f)) : [...list, folder];
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(nextList));
      return true;
    } catch (err) {
      console.error('Failed to save folder:', err);
      return false;
    }
  }

  public async deleteFolder(folderId: string): Promise<boolean> {
    try {
      const list = await this.listFolders();
      const nextList = list.filter((f) => f.id !== folderId && f.parentId !== folderId);
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(nextList));
      return true;
    } catch (err) {
      console.error('Failed to delete folder:', err);
      return false;
    }
  }

  // Crash Recovery
  public async getRecoveryRecord(): Promise<CrashRecoveryRecord | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECOVERY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async saveRecoveryRecord(record: CrashRecoveryRecord): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY_RECOVERY, JSON.stringify(record));
    } catch (err) {
      console.error('Failed to write recovery journal:', err);
    }
  }

  public async clearRecoveryRecord(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY_RECOVERY);
    } catch (err) {
      console.error('Failed to clear recovery record:', err);
    }
  }
}

export const defaultStorageProvider = new LocalStorageProvider();
