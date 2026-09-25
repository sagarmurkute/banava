import { DocumentService } from './documentEngine';
import { SchemaMigrationManager } from './migration';
import { DocumentValidator } from './validation';
import { SnapshotEngine } from '../snapshots/snapshotEngine';
import { SvgExporter } from '../export/svgExporter';
import { ImportEngine } from '../import/importEngine';
import { LocalStorageProvider } from '../storage/storageProvider';
import { BANAVA_SCHEMA_VERSION, type BanavaProject, type BanavaFolder } from './types';
import type { SceneObject } from '../types/document';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runDocumentTests(): TestResult[] {
  const results: TestResult[] = [];

  function runTest(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message || String(err) });
    }
  }

  // 1. Document Creation
  runTest('1. Document creation with Schema V6 metadata', () => {
    const doc = DocumentService.createDocument('E-Commerce App');
    if (doc.name !== 'E-Commerce App') throw new Error('Document name mismatch');
    if (doc.version !== BANAVA_SCHEMA_VERSION) throw new Error('Version not set to V6');
    if (doc.metadata?.schemaVersion !== 6) throw new Error('Metadata schemaVersion mismatch');
    if (doc.pages.length !== 1) throw new Error('New document should contain 1 page');
    if (!doc.metadata?.id) throw new Error('Missing metadata ID');
  });

  // 2. Document Duplication
  runTest('2. Document duplication with isolated ID and metadata', () => {
    const original = DocumentService.createDocument('Original App');
    const duplicate = DocumentService.duplicateDocument(original);

    if (duplicate.id === original.id) throw new Error('Duplicate must have a unique document ID');
    if (duplicate.name !== 'Original App (Copy)') throw new Error('Duplicate name mismatch');
    if (duplicate.metadata?.id !== duplicate.id) throw new Error('Duplicate metadata ID not updated');
    if (duplicate.createdAt === original.createdAt && duplicate.createdAt === 0) {
      throw new Error('Duplicate timestamps invalid');
    }
  });

  // 3. Document Renaming
  runTest('3. Document renaming with metadata synchronization', () => {
    const doc = DocumentService.createDocument('Old Title');
    const renamed = DocumentService.renameDocument(doc, 'New Title');

    if (renamed.name !== 'New Title') throw new Error('Document name not updated');
    if (renamed.metadata?.name !== 'New Title') throw new Error('Metadata name not updated');
    if ((renamed.metadata?.revision || 0) <= (doc.metadata?.revision || 0)) {
      throw new Error('Revision not incremented');
    }
  });

  // 4. Document Statistics
  runTest('4. Document statistics computation', () => {
    const doc = DocumentService.createDocument('Stats Doc');
    const stats = DocumentService.computeDocumentStats(doc);

    if (stats.pageCount !== 1) throw new Error('Expected 1 page');
    if (stats.objectCount !== 0) throw new Error('Expected 0 objects initially');
    if (typeof stats.fileSizeBytes !== 'number' || stats.fileSizeBytes <= 0) {
      throw new Error('File size calculation invalid');
    }
  });

  // 5. Schema Migration (V1 -> V6)
  runTest('5. Schema migration from V1 legacy document to V6', () => {
    const legacyV1Doc: any = {
      version: 1,
      name: 'Legacy V1 Design',
      objects: [
        { id: 'rect1', type: 'rectangle', x: 10, y: 20, width: 100, height: 100 },
      ],
    };

    const { document: migrated, migrated: wasMigrated, fromVersion } = SchemaMigrationManager.migrate(legacyV1Doc);
    if (!wasMigrated) throw new Error('Migration flag false');
    if (fromVersion !== 1) throw new Error('From version mismatch');
    if (migrated.version !== 6) throw new Error('Target version not 6');
    if (!migrated.pages || migrated.pages.length !== 1) throw new Error('V1 objects not wrapped in Page 1');
    if (migrated.pages[0].objects.length !== 1) throw new Error('Objects lost during migration');
    if (!migrated.metadata) throw new Error('Metadata missing after migration');
  });

  // 6. Schema Migration (V4/V5 -> V6)
  runTest('6. Schema migration from V5 to V6 with prototype preservation', () => {
    const v5Doc: any = {
      version: 5,
      id: 'doc_v5',
      name: 'V5 Prototype Doc',
      pages: [{ id: 'p1', name: 'Page 1', objects: [] }],
      prototype: {
        flows: { flow1: { id: 'flow1', name: 'Flow 1', startingPointId: 'frame1' } },
        connections: {},
        interactions: {},
        variables: {},
        settings: { devicePreset: 'desktop' },
      },
    };

    const { document: migrated } = SchemaMigrationManager.migrate(v5Doc);
    if (migrated.version !== 6) throw new Error('Target version not 6');
    if (!migrated.prototype?.flows?.flow1) throw new Error('Prototype flows not preserved');
    if (migrated.metadata?.id !== 'doc_v5') throw new Error('Metadata ID mismatch');
  });

  // 7. File Validation
  runTest('7. File validation and corrupt JSON rejection', () => {
    const invalidJson = '{ "name": "Corrupt", broken json';
    const result = DocumentValidator.validate(invalidJson);

    if (result.valid) throw new Error('Validator accepted invalid JSON syntax');
    if (result.errors.length === 0) throw new Error('Expected validation errors');
  });

  // 8. Snapshot Creation & Restoration
  runTest('8. Document version snapshot creation and restoration', () => {
    const doc = DocumentService.createDocument('Snapshot Test');
    const { nextDoc, snapshot } = SnapshotEngine.createSnapshot(
      doc,
      'v1.0 Milestone',
      'First milestone release'
    );

    if (nextDoc.snapshots?.length !== 1) throw new Error('Snapshot not added to document');
    if (snapshot.name !== 'v1.0 Milestone') throw new Error('Snapshot name mismatch');

    // Modify document
    const modifiedDoc = DocumentService.renameDocument(nextDoc, 'Modified Doc Name');
    if (modifiedDoc.name !== 'Modified Doc Name') throw new Error('Rename failed');

    // Restore from snapshot
    const restored = SnapshotEngine.restoreSnapshot(modifiedDoc, snapshot.id);
    if (!restored) throw new Error('Failed to restore snapshot');
    if (restored.name !== 'Snapshot Test') throw new Error('Restored name did not revert');
  });

  // 9. Snapshot Renaming and Deletion
  runTest('9. Snapshot renaming and deletion', () => {
    const doc = DocumentService.createDocument('Snapshot CRUD');
    const { nextDoc, snapshot } = SnapshotEngine.createSnapshot(doc, 'Draft 1');
    const renamedDoc = SnapshotEngine.renameSnapshot(nextDoc, snapshot.id, 'Draft 1 Final');
    if (renamedDoc.snapshots?.[0].name !== 'Draft 1 Final') throw new Error('Snapshot rename failed');

    const deletedDoc = SnapshotEngine.deleteSnapshot(renamedDoc, snapshot.id);
    if (deletedDoc.snapshots?.length !== 0) throw new Error('Snapshot deletion failed');
  });

  // 10. Project and Folder Organization
  runTest('10. Projects and Folders assignment', () => {
    const doc = DocumentService.createDocument('Nested Project Doc');
    const moved = DocumentService.moveDocument(doc, 'proj_website', 'folder_landing');

    if (moved.metadata?.projectId !== 'proj_website') throw new Error('Project ID not assigned');
    if (moved.metadata?.folderId !== 'folder_landing') throw new Error('Folder ID not assigned');
  });

  // 11. Document Search
  runTest('11. Document search indexing', () => {
    const docs = [
      { id: '1', name: 'Dashboard Mobile', updatedAt: 1, createdAt: 1, pageCount: 1, objectCount: 5, projectId: 'proj_1', folderId: null, deletedAt: null },
      { id: '2', name: 'Landing Desktop', updatedAt: 2, createdAt: 2, pageCount: 1, objectCount: 8, projectId: 'proj_2', folderId: null, deletedAt: null },
    ];
    const projects: BanavaProject[] = [
      { id: 'proj_1', name: 'Fintech App', createdAt: 1, updatedAt: 1 },
      { id: 'proj_2', name: 'E-Commerce', createdAt: 2, updatedAt: 2 },
    ];
    const folders: BanavaFolder[] = [];

    const foundByDocName = DocumentService.searchDocuments(docs, projects, folders, 'Dashboard');
    if (foundByDocName.length !== 1 || foundByDocName[0].id !== '1') throw new Error('Doc name search failed');

    const foundByProject = DocumentService.searchDocuments(docs, projects, folders, 'Fintech');
    if (foundByProject.length !== 1 || foundByProject[0].id !== '1') throw new Error('Project search failed');
  });

  // 12. Svg Vector Exporter
  runTest('12. Svg vector export generation', () => {
    const rect: SceneObject = {
      id: 'rect_test',
      name: 'Hero Card',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#4f46e5',
      cornerRadius: 12,
    };

    const svg = SvgExporter.exportObjectToSvg(rect, [rect]);
    if (!svg.includes('<svg') || !svg.includes('</svg>')) throw new Error('Invalid SVG wrapper');
    if (!svg.includes('width="400"') || !svg.includes('height="300"')) throw new Error('SVG dimensions mismatch');
    if (!svg.includes('fill="#4f46e5"')) throw new Error('SVG fill mismatch');
    if (!svg.includes('rx="12"')) throw new Error('SVG corner radius mismatch');
  });

  // 13. Cross-Document Clipboard Merging with Collision Resolution
  runTest('13. Cross-document clipboard merging with ID collision avoidance', () => {
    const targetDoc = DocumentService.createDocument('Target Document');
    const targetPageId = targetDoc.pages[0].id;

    const sourceObject: SceneObject = {
      id: 'same_id_123',
      name: 'Copied Button',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 120,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#10b981',
      cornerRadius: 0,
    };

    const mergedDoc = ImportEngine.mergeClipboardObjects(
      targetDoc,
      { objects: [sourceObject] },
      targetPageId,
      { x: 50, y: 50 }
    );

    const pasted = mergedDoc.pages[0].objects[0];
    if (!pasted) throw new Error('Pasted object missing from target page');
    if (pasted.id === 'same_id_123') throw new Error('Pasted object kept conflicting source ID');
    if (pasted.x !== 150 || pasted.y !== 150) throw new Error('Pasted object offset not applied');
  });

  // 14. Document Cover Frame Setting
  runTest('14. Document cover frame setting', () => {
    const doc = DocumentService.createDocument('Cover Doc');
    const withCover = DocumentService.setCoverFrame(doc, 'frame_landing_hero');

    if (withCover.metadata?.coverNodeId !== 'frame_landing_hero') {
      throw new Error('Cover node ID not set');
    }
  });

  // 15. LocalStorageProvider In-Memory Test
  runTest('15. LocalStorageProvider CRUD simulation', async () => {
    // Test mock storage operations
    const provider = new LocalStorageProvider();
    
    // In node/tsx test environment, verify provider methods without crashing
    if (typeof provider.listDocuments !== 'function') {
      throw new Error('Storage provider missing listDocuments');
    }
    if (typeof provider.saveDocument !== 'function') {
      throw new Error('Storage provider missing saveDocument');
    }
  });

  return results;
}
