import type {
  DocumentModel,
  Page,
  SceneObject,
  ComponentDefinition,
  ComponentInstanceObject,
} from '../types/document';
import { generateId } from '../utils/id';
import { recomputePageLayout } from '../layout/layoutEngine';

/**
 * Creates a Master Component from an existing SceneObject (frame or shape).
 */
export function createMasterComponent(
  doc: DocumentModel,
  pageId: string,
  objectId: string,
  name?: string,
  category = 'Components'
): { nextDoc: DocumentModel; componentId: string } {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return { nextDoc: doc, componentId: '' };

  const targetObj = page.objects.find((o) => o.id === objectId);
  if (!targetObj) return { nextDoc: doc, componentId: '' };

  const componentId = generateId('comp');
  const compName = name || targetObj.name || 'Component';

  const componentDef: ComponentDefinition = {
    id: componentId,
    name: compName,
    category,
    rootObjectId: objectId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Mark the master root object
  const nextObjects = page.objects.map((obj) => {
    if (obj.id === objectId) {
      return {
        ...obj,
        name: compName,
        isComponent: true,
        componentId: componentId,
      } as SceneObject;
    }
    return obj;
  });

  const nextPages = doc.pages.map((p) =>
    p.id === pageId ? recomputePageLayout({ ...p, objects: nextObjects }) : p
  );

  const nextComponents = {
    ...(doc.components || {}),
    [componentId]: componentDef,
  };

  const nextDoc: DocumentModel = {
    ...doc,
    pages: nextPages,
    components: nextComponents,
    updatedAt: Date.now(),
  };

  return { nextDoc, componentId };
}

/**
 * Creates an Instance of a Master Component at the given canvas coordinates.
 */
export function createComponentInstance(
  doc: DocumentModel,
  pageId: string,
  componentId: string,
  x: number,
  y: number,
  parentId: string | null = null
): { nextDoc: DocumentModel; instanceId: string } {
  const compDef = doc.components?.[componentId];
  if (!compDef) return { nextDoc: doc, instanceId: '' };

  // Locate the master root object and all its descendant children
  let masterRoot: SceneObject | undefined;
  let masterPage: Page | undefined;

  for (const page of doc.pages) {
    const found = page.objects.find((o) => o.id === compDef.rootObjectId);
    if (found) {
      masterRoot = found;
      masterPage = page;
      break;
    }
  }

  if (!masterRoot || !masterPage) return { nextDoc: doc, instanceId: '' };

  // Collect master children
  const getDescendants = (rootId: string): SceneObject[] => {
    const children = masterPage!.objects.filter((o) => o.parentId === rootId);
    let result = [...children];
    for (const child of children) {
      result = result.concat(getDescendants(child.id));
    }
    return result;
  };

  const masterChildren = getDescendants(masterRoot.id);

  // Generate ID map from masterId -> newInstanceChildId
  const idMap = new Map<string, string>();
  const instanceId = generateId('inst');
  idMap.set(masterRoot.id, instanceId);

  masterChildren.forEach((child) => {
    idMap.set(child.id, generateId(child.type));
  });

  // Create Instance Root
  const instanceRoot: ComponentInstanceObject = {
    ...(JSON.parse(JSON.stringify(masterRoot)) as any),
    id: instanceId,
    name: `${compDef.name} Instance`,
    type: 'instance',
    componentId: componentId,
    masterObjectId: masterRoot.id,
    isComponent: false,
    x,
    y,
    parentId,
    overrides: {},
    variantProperties: compDef.variantProperties
      ? { ...compDef.variantProperties }
      : undefined,
  };

  // Create Instance Cloned Children
  const clonedChildren: SceneObject[] = masterChildren.map((mChild) => {
    const cloned = JSON.parse(JSON.stringify(mChild)) as SceneObject;
    const newChildId = idMap.get(mChild.id)!;
    const newParentId = idMap.get(mChild.parentId!) || instanceId;

    return {
      ...cloned,
      id: newChildId,
      parentId: newParentId,
      masterObjectId: mChild.id,
      isComponent: false,
      componentId: undefined,
    } as SceneObject;
  });

  const nextPages = doc.pages.map((p) => {
    if (p.id !== pageId) return p;
    const updated = [...p.objects, instanceRoot, ...clonedChildren];
    return recomputePageLayout({ ...p, objects: updated });
  });

  const nextDoc: DocumentModel = {
    ...doc,
    pages: nextPages,
    updatedAt: Date.now(),
  };

  return { nextDoc, instanceId };
}

/**
 * Synchronizes all instances of a component across all pages when the master component changes.
 */
export function syncInstancesFromMaster(
  doc: DocumentModel,
  componentId: string
): DocumentModel {
  const compDef = doc.components?.[componentId];
  if (!compDef) return doc;

  // Find master root and children
  let masterRoot: SceneObject | undefined;
  let masterPage: Page | undefined;

  for (const page of doc.pages) {
    const found = page.objects.find((o) => o.id === compDef.rootObjectId);
    if (found) {
      masterRoot = found;
      masterPage = page;
      break;
    }
  }

  if (!masterRoot || !masterPage) return doc;

  const masterObjectsMap = new Map<string, SceneObject>();
  masterPage.objects.forEach((o) => masterObjectsMap.set(o.id, o));

  const nextPages = doc.pages.map((page) => {
    const instanceRoots = page.objects.filter(
      (o) => o.type === 'instance' && (o as ComponentInstanceObject).componentId === componentId
    ) as ComponentInstanceObject[];

    if (instanceRoots.length === 0) return page;

    let pageObjects = [...page.objects];

    for (const inst of instanceRoots) {
      const overrides = inst.overrides || {};

      pageObjects = pageObjects.map((obj) => {
        // Sync instance root itself
        if (obj.id === inst.id) {
          const rootOverrides = overrides[masterRoot!.id] || {};
          const instObj = obj as ComponentInstanceObject;
          return {
            ...masterRoot,
            id: instObj.id,
            type: 'instance',
            name: instObj.name,
            x: instObj.x,
            y: instObj.y,
            parentId: instObj.parentId,
            componentId: componentId,
            isComponent: false,
            overrides: instObj.overrides,
            propertyValues: instObj.propertyValues,
            variantProperties: instObj.variantProperties,
            fill: rootOverrides.fill ?? (masterRoot as any).fill,
            stroke: rootOverrides.stroke ?? (masterRoot as any).stroke,
            strokeWidth: rootOverrides.strokeWidth ?? (masterRoot as any).strokeWidth,
            strokeOpacity: rootOverrides.strokeOpacity ?? (masterRoot as any).strokeOpacity,
            cornerRadius: rootOverrides.cornerRadius ?? (masterRoot as any).cornerRadius,
            opacity: rootOverrides.opacity ?? masterRoot.opacity,
            visible: rootOverrides.visible ?? masterRoot.visible,
            ...rootOverrides,
          } as unknown as SceneObject;
        }

        // Sync instance children
        if (obj.masterObjectId) {
          const masterChild = masterObjectsMap.get(obj.masterObjectId);
          if (masterChild) {
            const childOverrides = overrides[obj.masterObjectId] || {};
            return {
              ...masterChild,
              ...obj, // preserve local id, parentId
              id: obj.id,
              parentId: obj.parentId,
              isComponent: false,
              componentId: undefined,
              masterObjectId: obj.masterObjectId,
              // Update master non-overridden properties
              fill: childOverrides.fill ?? (masterChild as any).fill,
              stroke: childOverrides.stroke ?? (masterChild as any).stroke,
              opacity: childOverrides.opacity ?? masterChild.opacity,
              visible: childOverrides.visible ?? masterChild.visible,
              content:
                masterChild.type === 'text'
                  ? childOverrides.content ?? (masterChild as any).content
                  : undefined,
              ...childOverrides,
            } as unknown as SceneObject;
          }
        }

        return obj;
      });
    }

    return recomputePageLayout({ ...page, objects: pageObjects });
  });

  return {
    ...doc,
    pages: nextPages,
    updatedAt: Date.now(),
  };
}

/**
 * Detaches an instance, converting it and all its children into normal independent scene objects.
 */
export function detachComponentInstance(
  doc: DocumentModel,
  pageId: string,
  instanceId: string
): DocumentModel {
  const nextPages = doc.pages.map((p) => {
    if (p.id !== pageId) return p;

    // Find instance subtree
    const getSubtreeIds = (rootId: string): Set<string> => {
      const ids = new Set<string>([rootId]);
      const children = p.objects.filter((o) => o.parentId === rootId);
      for (const c of children) {
        getSubtreeIds(c.id).forEach((id) => ids.add(id));
      }
      return ids;
    };

    const subtreeIds = getSubtreeIds(instanceId);

    const nextObjects = p.objects.map((obj) => {
      if (subtreeIds.has(obj.id)) {
        const detached = { ...obj };
        if (obj.id === instanceId && obj.type === 'instance') {
          detached.type = 'frame';
          delete (detached as any).overrides;
          delete (detached as any).propertyValues;
        }
        delete detached.componentId;
        delete detached.masterObjectId;
        delete detached.isComponent;
        return detached as SceneObject;
      }
      return obj;
    });

    return recomputePageLayout({ ...p, objects: nextObjects });
  });

  return {
    ...doc,
    pages: nextPages,
    updatedAt: Date.now(),
  };
}

/**
 * Switches an instance's variant within a Component Set.
 */
export function switchInstanceVariant(
  doc: DocumentModel,
  pageId: string,
  instanceId: string,
  targetVariantProperties: Record<string, string>
): DocumentModel {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return doc;

  const instance = page.objects.find((o) => o.id === instanceId) as ComponentInstanceObject | undefined;
  if (!instance || instance.type !== 'instance') return doc;

  const currentCompDef = doc.components?.[instance.componentId];
  if (!currentCompDef || !currentCompDef.componentSetId) return doc;

  const compSet = doc.componentSets?.[currentCompDef.componentSetId];
  if (!compSet) return doc;

  const mergedProps = {
    ...(instance.variantProperties || {}),
    ...targetVariantProperties,
  };

  // Find target variant component ID matching mergedProps
  let targetCompId = instance.componentId;
  for (const cId of compSet.componentIds) {
    const vDef = doc.components?.[cId];
    if (vDef && vDef.variantProperties) {
      const isMatch = Object.entries(mergedProps).every(
        ([k, v]) => vDef.variantProperties![k] === v
      );
      if (isMatch) {
        targetCompId = cId;
        break;
      }
    }
  }

  if (targetCompId === instance.componentId) {
    // Just update variant properties state
    const nextPages = doc.pages.map((p) => {
      if (p.id !== pageId) return p;
      const updated = p.objects.map((o) =>
        o.id === instanceId
          ? ({ ...o, variantProperties: mergedProps } as SceneObject)
          : o
      );
      return { ...p, objects: updated };
    });
    return { ...doc, pages: nextPages, updatedAt: Date.now() };
  }

  // Re-instantiate with target variant component, preserving coordinates and overrides
  const preserves = {
    x: instance.x,
    y: instance.y,
    parentId: instance.parentId,
    overrides: instance.overrides || {},
  };

  // Remove old instance subtree
  const getSubtreeIds = (rootId: string): Set<string> => {
    const ids = new Set<string>([rootId]);
    const children = page.objects.filter((o) => o.parentId === rootId);
    for (const c of children) {
      getSubtreeIds(c.id).forEach((id) => ids.add(id));
    }
    return ids;
  };
  const oldIds = getSubtreeIds(instanceId);

  const prunedPages = doc.pages.map((p) =>
    p.id === pageId
      ? { ...p, objects: p.objects.filter((o) => !oldIds.has(o.id)) }
      : p
  );

  const cleanDoc = { ...doc, pages: prunedPages };
  const { nextDoc: instantiatedDoc, instanceId: newInstId } = createComponentInstance(
    cleanDoc,
    pageId,
    targetCompId,
    preserves.x,
    preserves.y,
    preserves.parentId
  );

  // Restore overrides and variant properties on new instance
  const finalPages = instantiatedDoc.pages.map((p) => {
    if (p.id !== pageId) return p;
    const finalObjs = p.objects.map((o) => {
      if (o.id === newInstId) {
        return {
          ...o,
          overrides: preserves.overrides,
          variantProperties: mergedProps,
        } as SceneObject;
      }
      return o;
    });
    return recomputePageLayout({ ...p, objects: finalObjs });
  });

  return {
    ...instantiatedDoc,
    pages: finalPages,
    updatedAt: Date.now(),
  };
}
