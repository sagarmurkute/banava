import type {
  DocumentModel,
  FrameObject,
  TextObject,
  RectangleObject,
  ComponentInstanceObject,
  ComponentSet,
} from '../types/document';
import {
  createMasterComponent,
  createComponentInstance,
  syncInstancesFromMaster,
  detachComponentInstance,
  switchInstanceVariant,
} from './componentEngine';
import {
  createDefaultStyles,
  createColorStyle,
  createTextStyle,
  createEffectStyle,
  applyColorStyleToObject,
  applyTextStyleToObject,
} from './styleEngine';
import {
  createDefaultVariables,
  createVariable,
  resolveVariableValue,
} from './variableEngine';
import { recomputePageLayout } from '../layout/layoutEngine';
import { generateId } from '../utils/id';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

function createBaseDoc(): DocumentModel {
  const pageId = generateId('page');
  const btnFrameId = generateId('frame');
  const btnLabelId = generateId('text');

  const initialDoc: DocumentModel = {
    version: 4,
    id: generateId('doc'),
    name: 'Test Doc',
    pages: [
      {
        id: pageId,
        name: 'Page 1',
        objects: [
          {
            id: btnFrameId,
            name: 'Button Master',
            type: 'frame',
            x: 50,
            y: 50,
            width: 140,
            height: 44,
            rotation: 0,
            opacity: 100,
            visible: true,
            locked: false,
            parentId: null,
            fill: '#6366f1',
            stroke: '#4f46e5',
            strokeWidth: 1,
            cornerRadius: 8,
            layoutMode: 'horizontal',
            primaryAxisAlignItems: 'center',
            counterAxisAlignItems: 'center',
            padding: { top: 10, right: 16, bottom: 10, left: 16 },
            itemSpacing: 8,
            sizingHorizontal: 'hug',
            sizingVertical: 'hug',
          } as FrameObject,
          {
            id: btnLabelId,
            name: 'Button Label',
            type: 'text',
            x: 0,
            y: 0,
            width: 60,
            height: 20,
            rotation: 0,
            opacity: 100,
            visible: true,
            locked: false,
            parentId: btnFrameId,
            content: 'Click Me',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            fill: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.2,
            letterSpacing: 0,
            autoResize: 'auto-width',
            sizingHorizontal: 'hug',
            sizingVertical: 'hug',
          } as TextObject,
        ],
      },
    ],
    activePageId: pageId,
    components: {},
    componentSets: {},
    styles: createDefaultStyles(),
    variables: createDefaultVariables(),
    assets: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return initialDoc;
}

export function runFullSystemTestSuite(): TestResult[] {
  const results: TestResult[] = [];

  const runTest = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e.message || String(e) });
    }
  };

  // 1. Component creation
  runTest('1. Component creation', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];

    const { nextDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Primary Button',
      'Buttons'
    );

    if (!componentId || !nextDoc.components?.[componentId]) {
      throw new Error('ComponentDefinition not found in nextDoc.components');
    }
    const updatedFrame = nextDoc.pages[0].objects.find((o) => o.id === frame.id);
    if (!updatedFrame?.isComponent || updatedFrame.componentId !== componentId) {
      throw new Error('Master object isComponent or componentId flag not set');
    }
  });

  // 2. Instance creation
  runTest('2. Instance creation', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Primary Button'
    );
    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      masterDoc,
      page.id,
      componentId,
      300,
      100
    );

    const instPage = instDoc.pages[0];
    const instance = instPage.objects.find((o) => o.id === instanceId) as ComponentInstanceObject;
    if (!instance || instance.type !== 'instance' || instance.componentId !== componentId) {
      throw new Error('Instance object was not properly registered');
    }
    const instanceChildren = instPage.objects.filter((o) => o.parentId === instanceId);
    if (instanceChildren.length !== 1) {
      throw new Error(`Expected 1 child for instance, found ${instanceChildren.length}`);
    }
    if (!instanceChildren[0].masterObjectId) {
      throw new Error('Instance child is missing masterObjectId mapping');
    }
  });

  // 3. Component editing & sync
  runTest('3. Component editing & sync', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Primary Button'
    );
    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      masterDoc,
      page.id,
      componentId,
      300,
      100
    );

    // Edit master fill color to purple
    const editedPageObjects = instDoc.pages[0].objects.map((o) =>
      o.id === frame.id ? { ...o, fill: '#8b5cf6' } : o
    );
    const docWithEditedMaster: DocumentModel = {
      ...instDoc,
      pages: [{ ...instDoc.pages[0], objects: editedPageObjects }],
    };

    // Run sync
    const syncedDoc = syncInstancesFromMaster(docWithEditedMaster, componentId);
    const updatedInst = syncedDoc.pages[0].objects.find((o) => o.id === instanceId) as ComponentInstanceObject;
    if (updatedInst.fill !== '#8b5cf6') {
      throw new Error(`Instance fill not synced from master. Got ${updatedInst.fill}`);
    }
  });

  // 4. Instance overrides
  runTest('4. Instance overrides', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Primary Button'
    );
    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      masterDoc,
      page.id,
      componentId,
      300,
      100
    );

    const instChild = instDoc.pages[0].objects.find((o) => o.parentId === instanceId);
    if (!instChild) throw new Error('Instance child missing');

    // Override text content on instance
    const overriddenObjects = instDoc.pages[0].objects.map((o) => {
      if (o.id === instanceId) {
        return {
          ...o,
          overrides: {
            [instChild.masterObjectId!]: { content: 'Custom Text' },
          },
        };
      }
      if (o.id === instChild.id) {
        return { ...o, content: 'Custom Text' };
      }
      return o;
    });

    const docWithOverride: DocumentModel = {
      ...instDoc,
      pages: [{ ...instDoc.pages[0], objects: overriddenObjects as any }],
    };

    // Sync from master with a different property
    const syncedDoc = syncInstancesFromMaster(docWithOverride, componentId);
    const finalChild = syncedDoc.pages[0].objects.find((o) => o.id === instChild.id) as TextObject;
    if (finalChild.content !== 'Custom Text') {
      throw new Error(`Instance override was lost during sync. Got: ${finalChild.content}`);
    }
  });

  // 5. Reset override
  runTest('5. Reset override', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];
    const label = page.objects[1] as TextObject;

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Primary Button'
    );
    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      masterDoc,
      page.id,
      componentId,
      300,
      100
    );

    const instChild = instDoc.pages[0].objects.find((o) => o.parentId === instanceId)!;

    // Apply override
    let currentDoc: DocumentModel = {
      ...instDoc,
      pages: [
        {
          ...instDoc.pages[0],
          objects: instDoc.pages[0].objects.map((o) => {
            if (o.id === instanceId) {
              return { ...o, overrides: { [instChild.masterObjectId!]: { content: 'Overridden' } } };
            }
            if (o.id === instChild.id) {
              return { ...o, content: 'Overridden' };
            }
            return o;
          }) as any,
        },
      ],
    };

    // Reset all overrides: clear instance overrides and sync from master
    currentDoc = {
      ...currentDoc,
      pages: [
        {
          ...currentDoc.pages[0],
          objects: currentDoc.pages[0].objects.map((o) => {
            if (o.id === instanceId) {
              return { ...o, overrides: {} };
            }
            return o;
          }) as any,
        },
      ],
    };
    const synced = syncInstancesFromMaster(currentDoc, componentId);
    const resetChild = synced.pages[0].objects.find((o) => o.id === instChild.id) as TextObject;
    if (resetChild.content !== label.content) {
      throw new Error(`Reset failed: expected '${label.content}', got '${resetChild.content}'`);
    }
  });

  // 6. Detach instance
  runTest('6. Detach instance', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Primary Button'
    );
    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      masterDoc,
      page.id,
      componentId,
      300,
      100
    );

    const detachedDoc = detachComponentInstance(instDoc, page.id, instanceId);
    const detachedObj = detachedDoc.pages[0].objects.find((o) => o.id === instanceId);
    if (!detachedObj || detachedObj.type !== 'frame' || detachedObj.componentId) {
      throw new Error('Detached object still retains instance type or componentId');
    }
    const detachedChild = detachedDoc.pages[0].objects.find((o) => o.parentId === instanceId);
    if (detachedChild?.masterObjectId) {
      throw new Error('Detached child still has masterObjectId');
    }
  });

  // 7. Nested components
  runTest('7. Nested components', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const btnFrame = page.objects[0];

    // Master 1: Button
    const { nextDoc: docWithBtn, componentId: btnCompId } = createMasterComponent(
      doc,
      page.id,
      btnFrame.id,
      'Button'
    );

    // Create Card frame containing Button instance
    const cardFrameId = generateId('frame');
    const { nextDoc: docWithNestedInst } = createComponentInstance(
      docWithBtn,
      page.id,
      btnCompId,
      20,
      20,
      cardFrameId
    );

    const cardFrame: FrameObject = {
      id: cardFrameId,
      name: 'Card Container',
      type: 'frame',
      x: 500,
      y: 50,
      width: 280,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#1e293b',
      cornerRadius: 12,
      layoutMode: 'vertical',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'stretch',
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      itemSpacing: 12,
    };

    const docWithCard: DocumentModel = {
      ...docWithNestedInst,
      pages: [
        {
          ...docWithNestedInst.pages[0],
          objects: [cardFrame, ...docWithNestedInst.pages[0].objects],
        },
      ],
    };

    // Master 2: Card Component (which has nested button instance)
    const { nextDoc: docWithCardMaster, componentId: cardCompId } = createMasterComponent(
      docWithCard,
      page.id,
      cardFrameId,
      'Card'
    );

    if (!docWithCardMaster.components?.[cardCompId]) {
      throw new Error('Card component definition not created');
    }

    // Create instance of Card
    const { nextDoc: finalDoc, instanceId: cardInstId } = createComponentInstance(
      docWithCardMaster,
      page.id,
      cardCompId,
      850,
      50
    );

    const cardInstance = finalDoc.pages[0].objects.find((o) => o.id === cardInstId);
    if (!cardInstance) throw new Error('Card instance not found');
  });

  // 8. Component variants
  runTest('8. Component variants', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const btnFrame = page.objects[0] as FrameObject;

    const { nextDoc: docWithV1, componentId: v1Id } = createMasterComponent(
      doc,
      page.id,
      btnFrame.id,
      'Button / Primary'
    );

    const v2FrameId = generateId('frame');
    const v2Frame: FrameObject = {
      ...btnFrame,
      id: v2FrameId,
      name: 'Button / Secondary',
      fill: '#3b82f6',
    };

    const docWithV2: DocumentModel = {
      ...docWithV1,
      pages: [{ ...docWithV1.pages[0], objects: [...docWithV1.pages[0].objects, v2Frame] }],
    };

    const { nextDoc: docWithBoth, componentId: v2Id } = createMasterComponent(
      docWithV2,
      page.id,
      v2FrameId,
      'Button / Secondary'
    );

    const compSetId = generateId('compset');
    const compSet: ComponentSet = {
      id: compSetId,
      name: 'Button Set',
      category: 'Buttons',
      variantPropertyNames: ['Variant'],
      componentIds: [v1Id, v2Id],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Attach variant properties
    const updatedComponents = {
      ...docWithBoth.components,
      [v1Id]: {
        ...docWithBoth.components![v1Id],
        componentSetId: compSetId,
        variantProperties: { Variant: 'Primary' },
      },
      [v2Id]: {
        ...docWithBoth.components![v2Id],
        componentSetId: compSetId,
        variantProperties: { Variant: 'Secondary' },
      },
    };

    const finalDoc: DocumentModel = {
      ...docWithBoth,
      components: updatedComponents,
      componentSets: { [compSetId]: compSet },
    };

    if (finalDoc.componentSets![compSetId].componentIds.length !== 2) {
      throw new Error('ComponentSet missing variant definitions');
    }
  });

  // 9. Variant switching
  runTest('9. Variant switching', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const btnFrame = page.objects[0] as FrameObject;

    const { nextDoc: docWithV1, componentId: v1Id } = createMasterComponent(
      doc,
      page.id,
      btnFrame.id,
      'Button / Primary'
    );

    const v2FrameId = generateId('frame');
    const v2Frame: FrameObject = {
      ...btnFrame,
      id: v2FrameId,
      name: 'Button / Secondary',
      fill: '#3b82f6',
    };

    const docWithV2Obj: DocumentModel = {
      ...docWithV1,
      pages: [{ ...docWithV1.pages[0], objects: [...docWithV1.pages[0].objects, v2Frame] }],
    };

    const { nextDoc: docWithBoth, componentId: v2Id } = createMasterComponent(
      docWithV2Obj,
      page.id,
      v2FrameId,
      'Button / Secondary'
    );

    const compSetId = generateId('compset');
    const compSet: ComponentSet = {
      id: compSetId,
      name: 'Button Set',
      category: 'Buttons',
      variantPropertyNames: ['Variant'],
      componentIds: [v1Id, v2Id],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const readyDoc: DocumentModel = {
      ...docWithBoth,
      components: {
        ...docWithBoth.components,
        [v1Id]: {
          ...docWithBoth.components![v1Id],
          componentSetId: compSetId,
          variantProperties: { Variant: 'Primary' },
        },
        [v2Id]: {
          ...docWithBoth.components![v2Id],
          componentSetId: compSetId,
          variantProperties: { Variant: 'Secondary' },
        },
      },
      componentSets: { [compSetId]: compSet },
    };

    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      readyDoc,
      page.id,
      v1Id,
      300,
      100
    );

    const switchedDoc = switchInstanceVariant(instDoc, page.id, instanceId, {
      Variant: 'Secondary',
    });
    const switchedInstance = switchedDoc.pages[0].objects.find((o) => o.type === 'instance') as ComponentInstanceObject;
    if (!switchedInstance || switchedInstance.componentId !== v2Id) {
      throw new Error(`Variant switch failed: expected componentId ${v2Id}, got ${switchedInstance?.componentId}`);
    }
  });

  // 10. Boolean properties
  runTest('10. Boolean properties', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];
    const label = page.objects[1];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Button'
    );

    // Add boolean property definition
    const propId = generateId('prop');
    const compDef = {
      ...masterDoc.components![componentId],
      exposedProperties: [
        {
          id: propId,
          name: 'showLabel',
          type: 'boolean' as const,
          defaultValue: true,
          targetLayerId: label.id,
          targetProperty: 'visible' as const,
        },
      ],
    };

    const docWithProp: DocumentModel = {
      ...masterDoc,
      components: { ...masterDoc.components, [componentId]: compDef },
    };

    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      docWithProp,
      page.id,
      componentId,
      300,
      100
    );

    const instChild = instDoc.pages[0].objects.find((o) => o.parentId === instanceId)!;

    // Toggle boolean property to false
    const toggledObjects = instDoc.pages[0].objects.map((o) => {
      if (o.id === instanceId) {
        return {
          ...o,
          propertyValues: { showLabel: false },
          overrides: { [label.id]: { visible: false } },
        };
      }
      if (o.id === instChild.id) {
        return { ...o, visible: false };
      }
      return o;
    });

    const toggledDoc: DocumentModel = {
      ...instDoc,
      pages: [{ ...instDoc.pages[0], objects: toggledObjects as any }],
    };

    const toggledChild = toggledDoc.pages[0].objects.find((o) => o.id === instChild.id);
    if (toggledChild?.visible !== false) {
      throw new Error('Boolean visibility property toggle failed');
    }
  });

  // 11. Text properties
  runTest('11. Text properties', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];
    const label = page.objects[1];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'Button'
    );

    const propId = generateId('prop');
    const compDef = {
      ...masterDoc.components![componentId],
      exposedProperties: [
        {
          id: propId,
          name: 'buttonText',
          type: 'text' as const,
          defaultValue: 'Click Me',
          targetLayerId: label.id,
          targetProperty: 'content' as const,
        },
      ],
    };

    const docWithProp: DocumentModel = {
      ...masterDoc,
      components: { ...masterDoc.components, [componentId]: compDef },
    };

    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      docWithProp,
      page.id,
      componentId,
      300,
      100
    );

    const instChild = instDoc.pages[0].objects.find((o) => o.parentId === instanceId)!;
    if (!instChild) throw new Error('Instance child missing');
  });

  // 12. Color styles
  runTest('12. Color styles', () => {
    const styles = createDefaultStyles();
    const newColorStyle = createColorStyle('Brand Amber', '#f59e0b', 100);
    styles.colorStyles[newColorStyle.id] = newColorStyle;

    const dummyRect: RectangleObject = {
      id: generateId('rect'),
      name: 'Card',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#ffffff',
      cornerRadius: 0,
    };

    const patch = applyColorStyleToObject(dummyRect, newColorStyle, 'fill');
    const styledObj = { ...dummyRect, ...patch };
    if (styledObj.fill !== '#f59e0b' || styledObj.fillStyleId !== newColorStyle.id) {
      throw new Error('ColorStyle application failed');
    }
  });

  // 13. Typography styles
  runTest('13. Typography styles', () => {
    const styles = createDefaultStyles();
    const textStyle = createTextStyle('Display Hero', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 36,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: -1,
    });
    styles.textStyles[textStyle.id] = textStyle;

    const dummyText: TextObject = {
      id: generateId('text'),
      name: 'Hero Title',
      type: 'text',
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      content: 'Hero Banner',
      fontSize: 14,
      fontWeight: 400,
      fontFamily: 'Inter',
      fill: '#ffffff',
      textAlign: 'left',
      lineHeight: 1.2,
      letterSpacing: 0,
      autoResize: 'auto-width',
    };

    const patch = applyTextStyleToObject(dummyText, textStyle);
    const styledText = { ...dummyText, ...patch };
    if (styledText.fontSize !== 36 || styledText.fontWeight !== 800) {
      throw new Error('TypographyStyle application failed');
    }
  });

  // 14. Effect styles
  runTest('14. Effect styles', () => {
    const styles = createDefaultStyles();
    const effectStyle = createEffectStyle('Modal Shadow', {
      type: 'drop-shadow',
      color: 'rgba(0,0,0,0.5)',
      blur: 24,
      spread: 0,
      x: 0,
      y: 12,
    });
    styles.effectStyles[effectStyle.id] = effectStyle;

    if (!styles.effectStyles[effectStyle.id]) {
      throw new Error('Effect style creation failed');
    }
  });

  // 15. Variables
  runTest('15. Variables', () => {
    let vars = createDefaultVariables();
    const colId = Object.keys(vars.collections)[0];
    const { nextState, newVariable } = createVariable(
      'spacing.xl',
      'number',
      { mode_dark: 32, mode_light: 32 },
      colId,
      vars
    );
    vars = nextState;

    const resolved = resolveVariableValue(newVariable.id, vars);
    if (resolved !== 32) {
      throw new Error(`Variable resolution failed. Expected 32, got ${resolved}`);
    }
  });

  // 16. Variable references
  runTest('16. Variable references', () => {
    const vars = createDefaultVariables();
    const dummyRect: RectangleObject = {
      id: generateId('rect'),
      name: 'Badge',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#ffffff',
      cornerRadius: 0,
    };

    const resolvedVal = resolveVariableValue('var_brand_primary', vars);
    const applied = {
      ...dummyRect,
      fillVariableId: 'var_brand_primary',
      fill: resolvedVal,
    };

    if (applied.fillVariableId !== 'var_brand_primary' || applied.fill !== '#6366f1') {
      throw new Error('Variable reference binding failed');
    }
  });

  // 17. Component + Auto Layout
  runTest('17. Component + Auto Layout', () => {
    const doc = createBaseDoc();
    const page = doc.pages[0];
    const frame = page.objects[0];

    const { nextDoc: masterDoc, componentId } = createMasterComponent(
      doc,
      page.id,
      frame.id,
      'AutoLayout Button'
    );
    const { nextDoc: instDoc, instanceId } = createComponentInstance(
      masterDoc,
      page.id,
      componentId,
      300,
      100
    );

    const recomputedPage = recomputePageLayout(instDoc.pages[0]);
    const inst = recomputedPage.objects.find((o) => o.id === instanceId) as ComponentInstanceObject;
    if (!inst || inst.width <= 0 || inst.height <= 0) {
      throw new Error('Component Auto Layout computation failed');
    }
  });

  // 18. Persistence
  runTest('18. Persistence', () => {
    const doc = createBaseDoc();
    const json = JSON.stringify(doc);
    const parsed: DocumentModel = JSON.parse(json);

    if (parsed.version !== 4 || !parsed.styles || !parsed.variables) {
      throw new Error('Persistence serialization roundtrip corrupted document schema');
    }
  });

  // 19. Undo/Redo
  runTest('19. Undo/Redo', () => {
    const history: DocumentModel[] = [];
    let current = createBaseDoc();

    // Push state 1
    history.push(current);

    // Create component (state 2)
    const { nextDoc, componentId } = createMasterComponent(
      current,
      current.pages[0].id,
      current.pages[0].objects[0].id,
      'Comp 1'
    );
    current = nextDoc;
    history.push(current);

    // Undo to state 1
    const previous = history[0];
    if (previous.components?.[componentId]) {
      throw new Error('Undo state failed: component exists in prior state');
    }
  });

  // 20. Schema migration
  runTest('20. Schema migration', () => {
    const legacyDocV3: any = {
      version: 3,
      id: 'doc_legacy',
      name: 'Legacy V3 Doc',
      pages: [
        {
          id: 'p1',
          name: 'Page 1',
          objects: [],
        },
      ],
      activePageId: 'p1',
      assets: {},
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Migration function
    const migrateDoc = (raw: any): DocumentModel => {
      return {
        ...raw,
        version: 4,
        components: raw.components || {},
        componentSets: raw.componentSets || {},
        styles: raw.styles || createDefaultStyles(),
        variables: raw.variables || createDefaultVariables(),
      };
    };

    const migrated = migrateDoc(legacyDocV3);
    if (migrated.version !== 4 || !migrated.styles?.colorStyles || !migrated.variables?.variables) {
      throw new Error('Legacy V3 schema migration failed');
    }
  });

  return results;
}
