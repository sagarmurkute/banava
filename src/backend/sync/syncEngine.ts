import { isSupabaseConfigured } from '../supabaseClient';
import { DatabaseService } from '../database/databaseService';
import { CloudStorageService } from '../storage/cloudStorageService';
import { defaultStorageProvider } from '../../storage/storageProvider';
import type { SyncStatus } from '../types';
import type { DocumentModel } from '../../types/document';

export class SyncEngine {
  private static listeners: ((status: SyncStatus) => void)[] = [];
  private static status: SyncStatus = {
    state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
    lastSyncedAt: null,
    pendingUploadsCount: 0,
  };
  private static isSyncing = false;

  public static initialize(getUserId?: () => string | null) {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.updateStatus({ state: 'syncing', message: 'Reconnected to internet. Syncing...' });
      if (getUserId) {
        this.syncAll(getUserId);
      }
    });

    window.addEventListener('offline', () => {
      this.updateStatus({ state: 'offline', message: 'You are offline. Changes saved locally.' });
    });
  }

  public static setOfflineStatus(isOffline: boolean) {
    if (isOffline) {
      this.updateStatus({ state: 'offline', message: 'You are offline.' });
    } else {
      this.updateStatus({ state: 'synced', message: 'Online and connected' });
    }
  }

  public static markDocumentDirty(_docId: string) {
    this.updateStatus({ pendingUploadsCount: this.status.pendingUploadsCount + 1 });
  }

  public static subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public static getStatus(): SyncStatus {
    return this.status;
  }

  private static updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial };
    for (const listener of this.listeners) {
      listener(this.status);
    }
  }

  /**
   * Sync an individual document to Supabase (Database + Storage)
   */
  public static async syncDocumentToCloud(userId: string | null, doc: DocumentModel): Promise<boolean> {
    if (!userId || !isSupabaseConfigured()) {
      this.updateStatus({ state: 'local-only' });
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus({ state: 'offline', pendingUploadsCount: this.status.pendingUploadsCount + 1 });
      return false;
    }

    try {
      this.updateStatus({ state: 'syncing', message: `Syncing "${doc.name}"...` });

      // 1. Upload .banava file to Storage
      const { storagePath, fileSizeBytes, error: storageError } =
        await CloudStorageService.uploadDocumentFile(userId, doc);

      if (storageError) {
        console.warn('Storage sync issue (document preserved locally):', storageError.message);
      }

      // 2. Save metadata in PostgreSQL
      await DatabaseService.saveDocumentMetadata(userId, doc, storagePath, fileSizeBytes);

      this.updateStatus({
        state: 'synced',
        lastSyncedAt: Date.now(),
        message: 'Saved and synced to cloud',
      });
      return true;
    } catch (err: any) {
      console.error('Failed to sync document to cloud:', err);
      this.updateStatus({ state: 'error', message: 'Sync failed, saved locally' });
      return false;
    }
  }

  /**
   * Complete bi-directional sync (Projects, Folders, and Documents)
   */
  public static async syncAll(getUserId: () => string | null): Promise<void> {
    const userId = getUserId();
    if (!userId || !isSupabaseConfigured() || this.isSyncing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus({ state: 'offline' });
      return;
    }

    this.isSyncing = true;
    this.updateStatus({ state: 'syncing', message: 'Syncing with cloud...' });

    try {
      // 1. Sync Projects
      const localProjects = await defaultStorageProvider.listProjects();
      for (const p of localProjects) {
        await DatabaseService.saveProject(userId, p);
      }

      // 2. Sync Folders
      const localFolders = await defaultStorageProvider.listFolders();
      for (const f of localFolders) {
        await DatabaseService.saveFolder(userId, f);
      }

      // 3. Upload all local documents
      const localDocs = await defaultStorageProvider.listDocuments();
      for (const summary of localDocs) {
        const fullDoc = await defaultStorageProvider.getDocument(summary.id);
        if (fullDoc) {
          const { storagePath, fileSizeBytes } = await CloudStorageService.uploadDocumentFile(userId, fullDoc);
          await DatabaseService.saveDocumentMetadata(userId, fullDoc, storagePath, fileSizeBytes);
        }
      }

      this.updateStatus({
        state: 'synced',
        lastSyncedAt: Date.now(),
        pendingUploadsCount: 0,
        message: 'All documents synced',
      });
    } catch (err) {
      console.error('SyncAll failed:', err);
      this.updateStatus({ state: 'error', message: 'Cloud sync interrupted' });
    } finally {
      this.isSyncing = false;
    }
  }
}
