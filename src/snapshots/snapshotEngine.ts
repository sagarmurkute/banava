import type { DocumentModel } from '../types/document';
import type { DocumentSnapshot } from '../documents/types';
import { generateId } from '../utils/id';

export class SnapshotEngine {
  /**
   * Create a snapshot of the current document state
   */
  public static createSnapshot(
    doc: DocumentModel,
    name: string,
    description?: string,
    thumbnail?: string
  ): { nextDoc: DocumentModel; snapshot: DocumentSnapshot } {
    const snapshotId = generateId('snap');
    const now = Date.now();

    // Deduplicate asset data in snapshot by stripping heavy data URLs if needed, or storing compact document JSON
    const docCopy = JSON.parse(JSON.stringify(doc));
    // Clear nested snapshots from the serialized copy to prevent exponential size blowup
    delete docCopy.snapshots;

    const newSnapshot: DocumentSnapshot = {
      id: snapshotId,
      documentId: doc.id,
      name: name || `Snapshot ${new Date(now).toLocaleTimeString()}`,
      description,
      createdAt: now,
      thumbnail: thumbnail || doc.metadata?.thumbnail,
      docData: JSON.stringify(docCopy),
    };

    const currentSnapshots = doc.snapshots || [];
    const nextDoc: DocumentModel = {
      ...doc,
      snapshots: [newSnapshot, ...currentSnapshots],
      updatedAt: now,
    };

    return { nextDoc, snapshot: newSnapshot };
  }

  /**
   * Rename an existing snapshot
   */
  public static renameSnapshot(
    doc: DocumentModel,
    snapshotId: string,
    newName: string
  ): DocumentModel {
    if (!doc.snapshots) return doc;

    const nextSnapshots = doc.snapshots.map((s) =>
      s.id === snapshotId ? { ...s, name: newName } : s
    );

    return {
      ...doc,
      snapshots: nextSnapshots,
      updatedAt: Date.now(),
    };
  }

  /**
   * Delete a snapshot
   */
  public static deleteSnapshot(doc: DocumentModel, snapshotId: string): DocumentModel {
    if (!doc.snapshots) return doc;

    return {
      ...doc,
      snapshots: doc.snapshots.filter((s) => s.id !== snapshotId),
      updatedAt: Date.now(),
    };
  }

  /**
   * Restore document from snapshot
   */
  public static restoreSnapshot(
    currentDoc: DocumentModel,
    snapshotId: string
  ): DocumentModel | null {
    const snapshot = (currentDoc.snapshots || []).find((s) => s.id === snapshotId);
    if (!snapshot) return null;

    try {
      const restoredDoc: DocumentModel = JSON.parse(snapshot.docData);
      // Preserve existing snapshots list
      restoredDoc.snapshots = currentDoc.snapshots;
      restoredDoc.updatedAt = Date.now();
      return restoredDoc;
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      return null;
    }
  }
}
