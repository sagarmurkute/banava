import type { DocumentModel, SaveStatus } from '../types/document';
import { defaultStorageProvider } from './storageProvider';
import type { CrashRecoveryRecord } from '../documents/types';

export class RecoveryEngine {
  private static saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static journalDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Save document to storage provider with debouncing and status callback
   */
  public static queueAutoSave(
    doc: DocumentModel,
    onStatusChange?: (status: SaveStatus) => void,
    delayMs = 600
  ): void {
    if (onStatusChange) onStatusChange('unsaved');

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    if (this.journalDebounceTimer) {
      clearTimeout(this.journalDebounceTimer);
    }

    // Immediately record to crash journal
    this.journalDebounceTimer = setTimeout(() => {
      const record: CrashRecoveryRecord = {
        documentId: doc.id,
        documentName: doc.name,
        timestamp: Date.now(),
        documentData: JSON.stringify(doc),
      };
      defaultStorageProvider.saveRecoveryRecord(record);
    }, 200);

    // Save full document
    this.saveDebounceTimer = setTimeout(async () => {
      if (onStatusChange) onStatusChange('saving');
      try {
        const success = await defaultStorageProvider.saveDocument(doc);
        if (success) {
          if (onStatusChange) onStatusChange('saved');
          // Clear crash recovery journal since successfully persisted
          await defaultStorageProvider.clearRecoveryRecord();
        } else {
          if (onStatusChange) onStatusChange('error');
        }
      } catch (err) {
        console.error('AutoSave failed:', err);
        if (onStatusChange) onStatusChange('error');
      }
    }, delayMs);
  }

  /**
   * Immediate synchronous/blocking save
   */
  public static async saveImmediate(doc: DocumentModel): Promise<boolean> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    if (this.journalDebounceTimer) {
      clearTimeout(this.journalDebounceTimer);
    }

    try {
      const success = await defaultStorageProvider.saveDocument(doc);
      if (success) {
        await defaultStorageProvider.clearRecoveryRecord();
      }
      return success;
    } catch (err) {
      console.error('Immediate save failed:', err);
      return false;
    }
  }

  /**
   * Check for any unsaved crash recovery data
   */
  public static async checkForCrashRecovery(): Promise<CrashRecoveryRecord | null> {
    return defaultStorageProvider.getRecoveryRecord();
  }

  /**
   * Discard crash recovery data
   */
  public static async discardCrashRecovery(): Promise<void> {
    await defaultStorageProvider.clearRecoveryRecord();
  }
}
