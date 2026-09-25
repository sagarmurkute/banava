import type { DocumentModel, Page } from '../types/document';
import type {
  BanavaDocumentMetadata,
  BanavaProject,
  BanavaFolder,
  DocumentSummary,
} from './types';
import { BANAVA_SCHEMA_VERSION } from './types';
import { generateId } from '../utils/id';
import { createDefaultStyles } from '../system/styleEngine';
import { createDefaultVariables } from '../system/variableEngine';
import { createDefaultPrototypeData } from '../prototype/engine/prototypeEngine';

export class DocumentService {
  /**
   * Create a new blank document or template-based document
   */
  public static createDocument(name = 'Untitled Document', projectId?: string | null, folderId?: string | null): DocumentModel {
    const docId = generateId('doc');
    const pageId = generateId('page');
    const now = Date.now();

    const metadata: BanavaDocumentMetadata = {
      id: docId,
      name,
      createdAt: now,
      updatedAt: now,
      version: BANAVA_SCHEMA_VERSION,
      schemaVersion: BANAVA_SCHEMA_VERSION,
      author: 'Local User',
      projectId: projectId || null,
      folderId: folderId || null,
      deletedAt: null,
      isTemplate: false,
      revision: 1,
    };

    const initialPage: Page = {
      id: pageId,
      name: 'Page 1',
      objects: [],
    };

    const doc: DocumentModel = {
      version: BANAVA_SCHEMA_VERSION,
      id: docId,
      name,
      pages: [initialPage],
      activePageId: pageId,
      assets: {},
      components: {},
      componentSets: {},
      styles: createDefaultStyles(),
      variables: createDefaultVariables(),
      prototype: createDefaultPrototypeData(),
      metadata,
      snapshots: [],
      exportSettings: [
        { id: generateId('exp'), format: 'PNG', scale: 1, transparent: true },
        { id: generateId('exp'), format: 'SVG', scale: 1 },
      ],
      createdAt: now,
      updatedAt: now,
    };

    return doc;
  }

  /**
   * Duplicate an existing document with a brand new ID and metadata
   */
  public static duplicateDocument(sourceDoc: DocumentModel, newName?: string): DocumentModel {
    const newDocId = generateId('doc');
    const now = Date.now();
    const finalName = newName || `${sourceDoc.name} (Copy)`;

    const duplicatedDoc: DocumentModel = JSON.parse(JSON.stringify(sourceDoc));
    duplicatedDoc.id = newDocId;
    duplicatedDoc.name = finalName;
    duplicatedDoc.version = BANAVA_SCHEMA_VERSION;
    duplicatedDoc.createdAt = now;
    duplicatedDoc.updatedAt = now;
    duplicatedDoc.metadata = {
      ...sourceDoc.metadata,
      id: newDocId,
      name: finalName,
      createdAt: now,
      updatedAt: now,
      version: BANAVA_SCHEMA_VERSION,
      schemaVersion: BANAVA_SCHEMA_VERSION,
      deletedAt: null,
      revision: 1,
    };

    return duplicatedDoc;
  }

  /**
   * Rename document
   */
  public static renameDocument(doc: DocumentModel, newName: string): DocumentModel {
    const now = Date.now();
    return {
      ...doc,
      name: newName,
      metadata: {
        ...doc.metadata,
        id: doc.id,
        name: newName,
        createdAt: doc.metadata?.createdAt || doc.createdAt || now,
        updatedAt: now,
        version: BANAVA_SCHEMA_VERSION,
        schemaVersion: BANAVA_SCHEMA_VERSION,
        revision: (doc.metadata?.revision || 0) + 1,
      },
      updatedAt: now,
    };
  }

  /**
   * Move document to a specific project and/or folder
   */
  public static moveDocument(doc: DocumentModel, projectId: string | null, folderId: string | null): DocumentModel {
    const now = Date.now();
    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        id: doc.id,
        name: doc.name,
        createdAt: doc.metadata?.createdAt || doc.createdAt || now,
        updatedAt: now,
        version: BANAVA_SCHEMA_VERSION,
        schemaVersion: BANAVA_SCHEMA_VERSION,
        projectId,
        folderId,
        revision: (doc.metadata?.revision || 0) + 1,
      },
      updatedAt: now,
    };
  }

  /**
   * Set a specific frame as the document cover
   */
  public static setCoverFrame(doc: DocumentModel, frameId: string): DocumentModel {
    return {
      ...doc,
      metadata: {
        ...doc.metadata,
        id: doc.id,
        name: doc.name,
        createdAt: doc.metadata?.createdAt || doc.createdAt || Date.now(),
        updatedAt: Date.now(),
        version: BANAVA_SCHEMA_VERSION,
        schemaVersion: BANAVA_SCHEMA_VERSION,
        coverNodeId: frameId,
        revision: (doc.metadata?.revision || 0) + 1,
      },
    };
  }

  /**
   * Compute comprehensive document statistics
   */
  public static computeDocumentStats(doc: DocumentModel): {
    pageCount: number;
    objectCount: number;
    componentCount: number;
    variantCount: number;
    styleCount: number;
    variableCount: number;
    assetCount: number;
    prototypeFlowCount: number;
    prototypeConnectionCount: number;
    snapshotCount: number;
    fileSizeBytes: number;
  } {
    let objectCount = 0;
    for (const page of doc.pages) {
      objectCount += page.objects.length;
    }

    const componentCount = Object.keys(doc.components || {}).length;
    const variantCount = Object.keys(doc.componentSets || {}).length;
    const colorStyles = Object.keys(doc.styles?.colorStyles || {}).length;
    const textStyles = Object.keys(doc.styles?.textStyles || {}).length;
    const effectStyles = Object.keys(doc.styles?.effectStyles || {}).length;
    const styleCount = colorStyles + textStyles + effectStyles;
    const variableCount = Object.keys(doc.variables?.variables || {}).length;
    const assetCount = Object.keys(doc.assets || {}).length;
    const prototypeFlowCount = Object.keys(doc.prototype?.flows || {}).length;
    const prototypeConnectionCount = Object.keys(doc.prototype?.connections || {}).length;
    const snapshotCount = (doc.snapshots || []).length;
    const jsonStr = JSON.stringify(doc);
    const fileSizeBytes = new Blob([jsonStr]).size;

    return {
      pageCount: doc.pages.length,
      objectCount,
      componentCount,
      variantCount,
      styleCount,
      variableCount,
      assetCount,
      prototypeFlowCount,
      prototypeConnectionCount,
      snapshotCount,
      fileSizeBytes,
    };
  }

  /**
   * Search documents in the dashboard by keyword across names, projects, and folders
   */
  public static searchDocuments(
    documents: DocumentSummary[],
    projects: BanavaProject[],
    folders: BanavaFolder[],
    query: string
  ): DocumentSummary[] {
    const q = query.trim().toLowerCase();
    if (!q) return documents;

    const projectMap = new Map(projects.map((p) => [p.id, p.name.toLowerCase()]));
    const folderMap = new Map(folders.map((f) => [f.id, f.name.toLowerCase()]));

    return documents.filter((doc) => {
      if (doc.name.toLowerCase().includes(q)) return true;
      if (doc.projectId && projectMap.get(doc.projectId)?.includes(q)) return true;
      if (doc.folderId && folderMap.get(doc.folderId)?.includes(q)) return true;
      return false;
    });
  }
}
