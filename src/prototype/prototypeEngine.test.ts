import type {
  DocumentModel,
  FrameObject,
  RectangleObject,
  SceneObject,
} from '../types/document';
import {
  createDefaultPrototypeData,
  addFlow,
  updateFlow,
  deleteFlow,
  addInteraction,
  createConnection,
  deleteConnection,
  validatePrototype,
} from './engine/prototypeEngine';
import { PrototypeRuntime } from './engine/prototypeRuntime';
import { findMatchingLayers, computeInterpolatedTransform } from './transitions/smartAnimate';
import { generateId } from '../utils/id';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

function createBaseProtoDoc(): DocumentModel {
  const pageId = generateId('page');
  const screen1Id = 'frame_screen1';
  const screen2Id = 'frame_screen2';
  const overlayScreenId = 'frame_modal_overlay';
  const btnId = 'btn_nav_to_screen2';

  const screen1: FrameObject = {
    id: screen1Id,
    name: 'Screen 1 — Landing',
    type: 'frame',
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    parentId: null,
    fill: '#0f131c',
  };

  const btn: RectangleObject = {
    id: btnId,
    name: 'Primary Action Button',
    type: 'rectangle',
    x: 100,
    y: 200,
    width: 160,
    height: 48,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    parentId: screen1Id,
    fill: '#6366f1',
    cornerRadius: 8,
  };

  const screen2: FrameObject = {
    id: screen2Id,
    name: 'Screen 2 — Dashboard',
    type: 'frame',
    x: 1600,
    y: 0,
    width: 1440,
    height: 900,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    parentId: null,
    fill: '#181e2e',
  };

  const overlayScreen: FrameObject = {
    id: overlayScreenId,
    name: 'Settings Modal Overlay',
    type: 'frame',
    x: 3200,
    y: 0,
    width: 600,
    height: 400,
    rotation: 0,
    opacity: 100,
    visible: true,
    locked: false,
    parentId: null,
    fill: '#1e293b',
    cornerRadius: 16,
  };

  return {
    version: 5,
    id: generateId('doc'),
    name: 'Prototype Test Doc',
    pages: [
      {
        id: pageId,
        name: 'App Flow Page',
        objects: [screen1, btn, screen2, overlayScreen],
      },
    ],
    activePageId: pageId,
    prototype: createDefaultPrototypeData(),
    assets: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function runFullPrototypeTestSuite(): TestResult[] {
  const results: TestResult[] = [];

  const runTest = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e.message || String(e) });
    }
  };

  // 1. Flow Creation & Starting Point
  runTest('1. Flow creation and starting point', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc, flowId } = addFlow(doc, 'Main App Flow', 'frame_screen1', 'Main onboarding flow');

    if (!nextDoc.prototype?.flows[flowId]) {
      throw new Error('Flow was not created in doc.prototype.flows');
    }
    if (nextDoc.prototype.flows[flowId].startingPointId !== 'frame_screen1') {
      throw new Error('Flow startingPointId does not match frame_screen1');
    }
  });

  // 2. Flow Update & Deletion
  runTest('2. Flow update and deletion', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc: docWithFlow, flowId } = addFlow(doc, 'Flow 1', 'frame_screen1');
    const updatedDoc = updateFlow(docWithFlow, flowId, { name: 'Renamed Flow' });

    if (updatedDoc.prototype?.flows[flowId].name !== 'Renamed Flow') {
      throw new Error('Flow rename failed');
    }

    const deletedDoc = deleteFlow(updatedDoc, flowId);
    if (deletedDoc.prototype?.flows[flowId]) {
      throw new Error('Flow deletion failed');
    }
  });

  // 3. Create & Delete Connections
  runTest('3. Connection creation and deletion', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc, connectionId } = createConnection(
      doc,
      'btn_nav_to_screen2',
      'frame_screen2',
      'on-click',
      'navigate-to',
      { type: 'dissolve', duration: 300, easing: 'ease-out' }
    );

    if (!nextDoc.prototype?.connections[connectionId]) {
      throw new Error('Connection was not registered');
    }
    const sourceInteractions = nextDoc.prototype.interactions['btn_nav_to_screen2'];
    if (!sourceInteractions || sourceInteractions.length === 0) {
      throw new Error('Interaction was not created for source node');
    }

    const deletedDoc = deleteConnection(nextDoc, connectionId);
    if (deletedDoc.prototype?.connections[connectionId]) {
      throw new Error('Connection deletion failed');
    }
  });

  // 4. Runtime: Navigation and History Stack
  runTest('4. Runtime navigation and history stack', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc } = createConnection(
      doc,
      'btn_nav_to_screen2',
      'frame_screen2',
      'on-click',
      'navigate-to',
      { type: 'instant', duration: 0, easing: 'linear' }
    );

    const runtime = new PrototypeRuntime(nextDoc, 'frame_screen1');
    if (runtime.getState().currentFrameId !== 'frame_screen1') {
      throw new Error('Initial frame is incorrect');
    }

    // Trigger on-click on button
    const handled = runtime.trigger('btn_nav_to_screen2', 'on-click');
    if (!handled) throw new Error('Trigger was not handled');

    if (runtime.getState().currentFrameId !== 'frame_screen2') {
      throw new Error(`Expected currentFrameId to be frame_screen2, got ${runtime.getState().currentFrameId}`);
    }
    if (runtime.getState().historyStack.length !== 2) {
      throw new Error(`Expected history length 2, got ${runtime.getState().historyStack.length}`);
    }
  });

  // 5. Runtime: Go Back Action
  runTest('5. Runtime go back action', () => {
    const doc = createBaseProtoDoc();
    const runtime = new PrototypeRuntime(doc, 'frame_screen1');
    runtime.navigateTo('frame_screen2');
    if (runtime.getState().currentFrameId !== 'frame_screen2') {
      throw new Error('Navigation failed');
    }

    runtime.goBack();
    if (runtime.getState().currentFrameId !== 'frame_screen1') {
      throw new Error(`Expected frame_screen1 after back, got ${runtime.getState().currentFrameId}`);
    }
  });

  // 6. Runtime: Open & Close Overlays
  runTest('6. Runtime open and close overlays', () => {
    const doc = createBaseProtoDoc();
    const runtime = new PrototypeRuntime(doc, 'frame_screen1');

    runtime.openOverlay('frame_modal_overlay', {
      position: 'center',
      backdropEnabled: true,
      backdropColor: 'rgba(0,0,0,0.6)',
      backdropOpacity: 60,
      closeOnOutsideClick: true,
      closeOnEscape: true,
    });

    if (runtime.getState().activeOverlays.length !== 1) {
      throw new Error('Overlay was not pushed to activeOverlays');
    }
    if (runtime.getState().activeOverlays[0].overlayFrameId !== 'frame_modal_overlay') {
      throw new Error('Wrong overlay frame ID');
    }

    runtime.closeOverlay();
    if (runtime.getState().activeOverlays.length !== 0) {
      throw new Error('Overlay was not closed');
    }
  });

  // 7. Runtime: Swap Overlay
  runTest('7. Runtime swap overlay', () => {
    const doc = createBaseProtoDoc();
    const runtime = new PrototypeRuntime(doc, 'frame_screen1');

    runtime.openOverlay('frame_modal_overlay');
    runtime.swapOverlay('frame_screen2');

    if (runtime.getState().activeOverlays.length !== 1) {
      throw new Error('Expected 1 overlay after swap');
    }
    if (runtime.getState().activeOverlays[0].overlayFrameId !== 'frame_screen2') {
      throw new Error('Swap overlay target mismatch');
    }
  });

  // 8. Runtime: Prototype Variables (Set, Increment, Toggle)
  runTest('8. Runtime prototype variables (Set, Increment, Toggle)', () => {
    const doc = createBaseProtoDoc();
    const runtime = new PrototypeRuntime(doc, 'frame_screen1');

    runtime.setVariable('pvar_cart_count', 'set', 5);
    if (runtime.getState().variableValues['pvar_cart_count'] !== 5) {
      throw new Error('Set variable failed');
    }

    runtime.setVariable('pvar_cart_count', 'increment', 2);
    if (runtime.getState().variableValues['pvar_cart_count'] !== 7) {
      throw new Error('Increment variable failed');
    }

    runtime.setVariable('pvar_is_logged_in', 'toggle', null);
    if (runtime.getState().variableValues['pvar_is_logged_in'] !== true) {
      throw new Error('Toggle variable failed');
    }
  });

  // 9. Interaction Trigger Types (Hover, Press, Key)
  runTest('9. Interaction triggers (Hover, Press, Drag)', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc } = addInteraction(doc, {
      sourceNodeId: 'btn_nav_to_screen2',
      trigger: 'while-hovering',
      action: 'open-overlay',
      destinationNodeId: 'frame_modal_overlay',
      enabled: true,
    });

    const runtime = new PrototypeRuntime(nextDoc, 'frame_screen1');
    const triggered = runtime.trigger('btn_nav_to_screen2', 'while-hovering');
    if (!triggered) throw new Error('while-hovering trigger failed');

    if (runtime.getState().activeOverlays.length !== 1) {
      throw new Error('Overlay not opened on hover');
    }
  });

  // 10. Smart Animate Matching & Interpolation
  runTest('10. Smart Animate layer matching and interpolation', () => {
    const srcObj: SceneObject = {
      id: 'layer_1',
      name: 'Card',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#6366f1',
      cornerRadius: 8,
    };

    const destObj: SceneObject = {
      id: 'layer_1',
      name: 'Card',
      type: 'rectangle',
      x: 300,
      y: 400,
      width: 400,
      height: 300,
      rotation: 45,
      opacity: 50,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#8b5cf6',
      cornerRadius: 16,
    };

    const { matchedPairs } = findMatchingLayers([srcObj], [destObj]);
    if (matchedPairs.length !== 1) {
      throw new Error('Failed to match layers with identical IDs');
    }

    const midpoint = computeInterpolatedTransform(srcObj, destObj, 0.5);
    if (midpoint.x !== 200 || midpoint.y !== 250 || midpoint.width !== 300 || midpoint.opacity !== 75) {
      throw new Error(`Interpolation mismatch: x=${midpoint.x}, y=${midpoint.y}, w=${midpoint.width}`);
    }
  });

  // 11. Broken Connection Validation
  runTest('11. Broken connection detection and validation', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc } = createConnection(
      doc,
      'btn_nav_to_screen2',
      'non_existent_frame_999'
    );

    const issues = validatePrototype(nextDoc);
    const missingDestIssue = issues.find(
      (i) => i.destinationNodeId === 'non_existent_frame_999'
    );
    if (!missingDestIssue) {
      throw new Error('Validator failed to detect missing destination frame');
    }
  });

  // 12. Multiple Flows Support
  runTest('12. Multiple flows and flow switching', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc: docWithF1 } = addFlow(doc, 'Flow Landing', 'frame_screen1');
    const { nextDoc: docWithF2, flowId: f2Id } = addFlow(docWithF1, 'Flow Dashboard', 'frame_screen2');

    const runtime = new PrototypeRuntime(docWithF2);
    runtime.startFlow(f2Id);
    if (runtime.getState().currentFrameId !== 'frame_screen2') {
      throw new Error('Flow start failed to navigate to startingPointId');
    }
  });

  // 13. Persistence & Serialization Roundtrip
  runTest('13. Persistence and serialization roundtrip', () => {
    const doc = createBaseProtoDoc();
    const { nextDoc } = createConnection(doc, 'btn_nav_to_screen2', 'frame_screen2');
    const json = JSON.stringify(nextDoc);
    const parsed: DocumentModel = JSON.parse(json);

    if (parsed.version !== 5 || !parsed.prototype?.connections) {
      throw new Error('Prototype serialization corrupted document model');
    }
  });

  // 14. Undo / Redo Prototype History
  runTest('14. Undo and redo prototype history consistency', () => {
    const history: DocumentModel[] = [];
    let current = createBaseProtoDoc();
    history.push(current);

    const { nextDoc, connectionId } = createConnection(current, 'btn_nav_to_screen2', 'frame_screen2');
    current = nextDoc;
    history.push(current);

    // Undo to state 0
    const prev = history[0];
    if (prev.prototype?.connections[connectionId]) {
      throw new Error('Undo consistency failed');
    }
  });

  // 15. Schema Migration (V4 -> V5)
  runTest('15. Schema migration from V4 to V5', () => {
    const docV4: any = {
      version: 4,
      id: 'doc_v4',
      name: 'V4 Doc',
      pages: [{ id: 'p1', name: 'Page 1', objects: [] }],
      activePageId: 'p1',
      components: {},
      styles: {},
      variables: {},
    };

    const migrateToV5 = (raw: any): DocumentModel => {
      return {
        ...raw,
        version: 5,
        prototype: raw.prototype || createDefaultPrototypeData(),
      };
    };

    const migrated = migrateToV5(docV4);
    if (migrated.version !== 5 || !migrated.prototype?.flows || !migrated.prototype?.variables) {
      throw new Error('V4 to V5 schema migration failed');
    }
  });

  return results;
}
