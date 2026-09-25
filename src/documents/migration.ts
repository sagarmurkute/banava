import type { DocumentModel } from '../types/document';
import { BANAVA_SCHEMA_VERSION, type BanavaDocumentMetadata } from './types';
import { createDefaultStyles } from '../system/styleEngine';
import { createDefaultVariables } from '../system/variableEngine';
import { createDefaultPrototypeData } from '../prototype/engine/prototypeEngine';
import { generateId } from '../utils/id';

export class SchemaMigrationManager {
  /**
   * Migrate any document from legacy version (1, 2, 3, 4, 5) up to version 6
   */
  public static migrate(rawDoc: any): { document: DocumentModel; migrated: boolean; fromVersion: number } {
    if (!rawDoc || typeof rawDoc !== 'object') {
      throw new Error('Invalid document format: Document is not an object');
    }

    let doc = { ...rawDoc };
    const originalVersion = doc.schemaVersion || doc.version || 1;
    let currentVersion = originalVersion;
    let wasMigrated = false;

    // V1 -> V2: Ensure pages array and basic object geometry
    if (currentVersion < 2) {
      if (!Array.isArray(doc.pages) || doc.pages.length === 0) {
        doc.pages = [
          {
            id: 'page_1',
            name: 'Page 1',
            objects: Array.isArray(doc.objects) ? doc.objects : [],
          },
        ];
      }
      if (!doc.assets) doc.assets = {};
      currentVersion = 2;
      wasMigrated = true;
    }

    // V2 -> V3: Frame layouts, Auto Layout, constraints, padding
    if (currentVersion < 3) {
      for (const page of doc.pages) {
        for (const obj of page.objects) {
          if (obj.type === 'frame') {
            if (!obj.layoutMode) obj.layoutMode = 'none';
            if (obj.itemSpacing === undefined) obj.itemSpacing = 0;
            if (!obj.padding) obj.padding = { top: 0, right: 0, bottom: 0, left: 0 };
          }
          if (!obj.constraints) {
            obj.constraints = { horizontal: 'left', vertical: 'top' };
          }
        }
      }
      currentVersion = 3;
      wasMigrated = true;
    }

    // V3 -> V4: Design system components, styles, and variables
    if (currentVersion < 4) {
      if (!doc.components) doc.components = {};
      if (!doc.componentSets) doc.componentSets = {};
      if (!doc.styles) doc.styles = createDefaultStyles();
      if (!doc.variables) doc.variables = createDefaultVariables();
      currentVersion = 4;
      wasMigrated = true;
    }

    // V4 -> V5: Prototype flows, interactions, transitions
    if (currentVersion < 5) {
      if (!doc.prototype) {
        doc.prototype = createDefaultPrototypeData();
      }
      currentVersion = 5;
      wasMigrated = true;
    }

    // V5 -> V6: Metadata, snapshots, export settings, project/folder tracking
    if (currentVersion < 6) {
      const docId = doc.id || generateId('doc');
      const now = Date.now();

      const metadata: BanavaDocumentMetadata = {
        id: docId,
        name: doc.name || 'Untitled Document',
        description: doc.description || '',
        createdAt: doc.createdAt || now,
        updatedAt: doc.updatedAt || now,
        version: BANAVA_SCHEMA_VERSION,
        schemaVersion: BANAVA_SCHEMA_VERSION,
        author: doc.author || 'Local User',
        thumbnail: doc.thumbnail,
        coverNodeId: doc.coverNodeId,
        projectId: doc.projectId ?? null,
        folderId: doc.folderId ?? null,
        deletedAt: null,
        isTemplate: false,
        revision: 1,
      };

      doc.id = docId;
      doc.metadata = metadata;
      if (!doc.snapshots) doc.snapshots = [];
      if (!doc.exportSettings) doc.exportSettings = [];
      doc.version = BANAVA_SCHEMA_VERSION;
      doc.schemaVersion = BANAVA_SCHEMA_VERSION;

      currentVersion = 6;
      wasMigrated = true;
    }

    return {
      document: doc as DocumentModel,
      migrated: wasMigrated,
      fromVersion: originalVersion,
    };
  }
}
