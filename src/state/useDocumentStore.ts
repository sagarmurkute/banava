import { create } from 'zustand';
import type {
  DocumentModel,
  Page,
  SceneObject,
  AlignmentType,
  Asset,
  SaveStatus,
  FrameObject,
  ColorStyle,
  TextStyle,
  EffectStyle,
  Variable,
  VariableType,
  ComponentInstanceObject,
} from '../types/document';
import { loadDocumentFromStorage, saveDocumentToStorage, saveDocumentImmediate } from '../storage/localStorage';
import { generateId } from '../utils/id';
import { calculateBoundingBox } from '../utils/geometry';
import { recomputePageLayout } from '../layout/layoutEngine';
import { applyFrameResizeConstraints } from '../layout/constraints';
import {
  createMasterComponent,
  createComponentInstance,
  syncInstancesFromMaster,
  detachComponentInstance,
  switchInstanceVariant,
} from '../system/componentEngine';
import {
  createColorStyle as makeColorStyle,
  createTextStyle as makeTextStyle,
  createEffectStyle as makeEffectStyle,
} from '../system/styleEngine';
import { createVariable as makeVariable } from '../system/variableEngine';
import type {
  PrototypeFlow,
  PrototypeInteraction,
  PrototypeTrigger,
  PrototypeAction,
  PrototypeTransition,
  OverlayConfig,
  PrototypeSettings,
} from '../prototype/types';
import {
  addFlow as makeFlow,
  updateFlow as modifyFlow,
  deleteFlow as removeFlow,
  setFlowStartingPoint as assignStartingPoint,
  addInteraction as makeInteraction,
  updateInteraction as modifyInteraction,
  deleteInteraction as removeInteraction,
  createConnection as makeConnection,
  deleteConnection as removeConnection,
  createDefaultPrototypeData,
} from '../prototype/engine/prototypeEngine';

interface DocumentStoreState {
  doc: DocumentModel;
  past: DocumentModel[];
  future: DocumentModel[];
  saveStatus: SaveStatus;

  // Page actions
  setActivePage: (pageId: string) => void;
  addPage: (name?: string) => string;
  renamePage: (pageId: string, name: string) => void;
  deletePage: (pageId: string) => void;

  // Object actions
  getActivePage: () => Page;
  getObjectById: (id: string) => SceneObject | undefined;
  addObject: (object: SceneObject, pageId?: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>, recordHistory?: boolean) => void;
  updateObjects: (updates: Record<string, Partial<SceneObject>>, recordHistory?: boolean) => void;
  deleteObjects: (ids: string[]) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  renameObject: (id: string, name: string) => void;
  duplicateObjects: (ids: string[], offset?: { x: number; y: number }) => string[];
  reorderObject: (objectId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  reparentObject: (objectId: string, newParentId: string | null) => void;
  groupObjects: (ids: string[]) => string | null;
  ungroupObjects: (groupIds: string[]) => string[];
  alignObjects: (alignment: AlignmentType, selectedIds: string[]) => void;

  // Layout Engine
  recomputeLayout: () => void;
  resizeFrameWithConstraints: (frameId: string, newWidth: number, newHeight: number) => void;

  // Phase 4: Component Actions
  createComponent: (objectId: string, name?: string, category?: string) => string;
  createInstance: (componentId: string, x: number, y: number, parentId?: string | null) => string;
  overrideInstanceProperty: (instanceId: string, targetMasterId: string, property: string, value: any) => void;
  resetInstanceOverride: (instanceId: string, targetMasterId: string, property?: string) => void;
  resetAllInstanceOverrides: (instanceId: string) => void;
  detachInstance: (instanceId: string) => void;
  switchVariant: (instanceId: string, variantProps: Record<string, string>) => void;

  // Phase 4: Style Actions
  createColorStyle: (name: string, color: string, opacity?: number, description?: string) => string;
  updateColorStyle: (id: string, updates: Partial<ColorStyle>) => void;
  deleteColorStyle: (id: string) => void;
  createTextStyle: (name: string, params: Omit<TextStyle, 'id' | 'name'>) => string;
  updateTextStyle: (id: string, updates: Partial<TextStyle>) => void;
  deleteTextStyle: (id: string) => void;
  createEffectStyle: (name: string, params: Omit<EffectStyle, 'id' | 'name'>) => string;
  updateEffectStyle: (id: string, updates: Partial<EffectStyle>) => void;
  deleteEffectStyle: (id: string) => void;

  // Phase 4: Variable / Design Token Actions
  createVariable: (name: string, type: VariableType, valuesByMode: Record<string, any>, collectionId?: string, description?: string) => string;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  deleteVariable: (id: string) => void;
  setCollectionActiveMode: (collectionId: string, modeId: string) => void;

  // Phase 5: Prototyping Actions
  createFlow: (name: string, startingPointId: string, description?: string) => string;
  updateFlow: (flowId: string, updates: Partial<PrototypeFlow>) => void;
  deleteFlow: (flowId: string) => void;
  setStartingPoint: (frameId: string, flowName?: string) => string;
  addInteraction: (interaction: Omit<PrototypeInteraction, 'id'>) => string;
  updateInteraction: (sourceNodeId: string, interactionId: string, updates: Partial<PrototypeInteraction>) => void;
  deleteInteraction: (sourceNodeId: string, interactionId: string) => void;
  createConnection: (
    sourceId: string,
    destId: string,
    trigger?: PrototypeTrigger,
    action?: PrototypeAction,
    transition?: PrototypeTransition,
    overlay?: OverlayConfig
  ) => string;
  deleteConnection: (connectionId: string) => void;
  updatePrototypeSettings: (settings: Partial<PrototypeSettings>) => void;

  // Asset actions
  addAsset: (asset: Asset) => void;
  getAsset: (assetId: string) => Asset | undefined;

  // History actions
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  save: () => void;
  setSaveStatus: (status: SaveStatus) => void;
}

const MAX_HISTORY = 40;
const initialDoc = loadDocumentFromStorage();

function cloneDoc(doc: DocumentModel): DocumentModel {
  return JSON.parse(JSON.stringify(doc));
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  doc: initialDoc,
  past: [],
  future: [],
  saveStatus: 'saved',

  setSaveStatus: (status: SaveStatus) => set({ saveStatus: status }),

  getActivePage: () => {
    const { doc } = get();
    return doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  },

  getObjectById: (id: string) => {
    const page = get().getActivePage();
    return page?.objects.find((o) => o.id === id);
  },

  addAsset: (asset: Asset) => {
    set((state) => {
      const nextAssets = { ...state.doc.assets, [asset.id]: asset };
      const nextDoc = { ...state.doc, assets: nextAssets, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return { doc: nextDoc };
    });
  },

  getAsset: (assetId: string) => {
    return get().doc.assets[assetId];
  },

  setActivePage: (pageId: string) => {
    set((state) => {
      if (state.doc.activePageId === pageId) return state;
      const nextDoc = { ...state.doc, activePageId: pageId };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return { doc: nextDoc };
    });
  },

  addPage: (name?: string) => {
    const newPageId = generateId('page');
    set((state) => {
      const pageNumber = state.doc.pages.length + 1;
      const newPage: Page = {
        id: newPageId,
        name: name || `Page ${pageNumber}`,
        objects: [],
      };
      const nextDoc = {
        ...state.doc,
        pages: [...state.doc.pages, newPage],
        activePageId: newPageId,
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
    return newPageId;
  },

  renamePage: (pageId: string, name: string) => {
    if (!name.trim()) return;
    set((state) => {
      const nextPages = state.doc.pages.map((p) =>
        p.id === pageId ? { ...p, name: name.trim() } : p
      );
      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deletePage: (pageId: string) => {
    set((state) => {
      if (state.doc.pages.length <= 1) return state;
      const nextPages = state.doc.pages.filter((p) => p.id !== pageId);
      const nextActiveId =
        state.doc.activePageId === pageId ? nextPages[0].id : state.doc.activePageId;
      const nextDoc = {
        ...state.doc,
        pages: nextPages,
        activePageId: nextActiveId,
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  addObject: (object: SceneObject, pageId?: string) => {
    set((state) => {
      const targetPageId = pageId || state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id === targetPageId) {
          return recomputePageLayout({
            ...p,
            objects: [...p.objects, object],
          });
        }
        return p;
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  updateObject: (id: string, updates: Partial<SceneObject>, recordHistory = false) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      let hasChange = false;
      let affectedComponentId: string | undefined;

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const nextObjects = p.objects.map((obj) => {
          if (obj.id === id) {
            hasChange = true;
            if (obj.isComponent) {
              affectedComponentId = obj.componentId;
            }
            return { ...obj, ...updates } as SceneObject;
          }
          return obj;
        });

        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      if (!hasChange) return state;

      let nextDoc: DocumentModel = { ...state.doc, pages: nextPages, updatedAt: Date.now() };

      // Sync instances if master component changed
      if (affectedComponentId) {
        nextDoc = syncInstancesFromMaster(nextDoc, affectedComponentId);
      }

      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: recordHistory
          ? [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)]
          : state.past,
        future: recordHistory ? [] : state.future,
        doc: nextDoc,
      };
    });
  },

  updateObjects: (updates: Record<string, Partial<SceneObject>>, recordHistory = false) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const affectedComponents = new Set<string>();

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const nextObjects = p.objects.map((obj) => {
          if (updates[obj.id]) {
            if (obj.isComponent && obj.componentId) {
              affectedComponents.add(obj.componentId);
            }
            return { ...obj, ...updates[obj.id] } as SceneObject;
          }
          return obj;
        });

        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      let nextDoc: DocumentModel = { ...state.doc, pages: nextPages, updatedAt: Date.now() };

      affectedComponents.forEach((cId) => {
        nextDoc = syncInstancesFromMaster(nextDoc, cId);
      });

      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: recordHistory
          ? [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)]
          : state.past,
        future: recordHistory ? [] : state.future,
        doc: nextDoc,
      };
    });
  },

  deleteObjects: (ids: string[]) => {
    if (ids.length === 0) return;
    set((state) => {
      const activeId = state.doc.activePageId;
      const idsToDelete = new Set<string>(ids);

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        // Cascade delete children
        const findChildren = (parentId: string) => {
          p.objects.forEach((o) => {
            if (o.parentId === parentId && !idsToDelete.has(o.id)) {
              idsToDelete.add(o.id);
              findChildren(o.id);
            }
          });
        };

        ids.forEach((id) => findChildren(id));

        const filtered = p.objects.filter((o) => !idsToDelete.has(o.id));
        return recomputePageLayout({ ...p, objects: filtered });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  toggleVisibility: (id: string) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;
        const nextObjects = p.objects.map((obj) =>
          obj.id === id ? ({ ...obj, visible: !obj.visible } as SceneObject) : obj
        );
        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  toggleLock: (id: string) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;
        const nextObjects = p.objects.map((obj) =>
          obj.id === id ? ({ ...obj, locked: !obj.locked } as SceneObject) : obj
        );
        return { ...p, objects: nextObjects };
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  renameObject: (id: string, name: string) => {
    if (!name.trim()) return;
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;
        const nextObjects = p.objects.map((obj) =>
          obj.id === id ? ({ ...obj, name: name.trim() } as SceneObject) : obj
        );
        return { ...p, objects: nextObjects };
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  duplicateObjects: (ids: string[], offset = { x: 20, y: 20 }) => {
    if (ids.length === 0) return [];
    const newIds: string[] = [];
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const cloned: SceneObject[] = [];
        for (const orig of p.objects) {
          if (ids.includes(orig.id)) {
            const newId = generateId(orig.type);
            newIds.push(newId);
            const clonedObj: SceneObject = JSON.parse(JSON.stringify(orig));
            clonedObj.id = newId;
            clonedObj.name = `${orig.name} Copy`;
            clonedObj.x = orig.x + offset.x;
            clonedObj.y = orig.y + offset.y;
            cloned.push(clonedObj);
          }
        }

        return recomputePageLayout({ ...p, objects: [...p.objects, ...cloned] });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
    return newIds;
  },

  reorderObject: (objectId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const objects = [...p.objects];
        const idx = objects.findIndex((o) => o.id === objectId);
        if (idx === -1) return p;

        const item = objects[idx];
        objects.splice(idx, 1);

        if (direction === 'top') {
          objects.push(item);
        } else if (direction === 'bottom') {
          objects.unshift(item);
        } else if (direction === 'up') {
          const target = Math.min(objects.length, idx + 1);
          objects.splice(target, 0, item);
        } else if (direction === 'down') {
          const target = Math.max(0, idx - 1);
          objects.splice(target, 0, item);
        }

        return recomputePageLayout({ ...p, objects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  groupObjects: (ids: string[]) => {
    if (ids.length < 2) return null;
    const groupId = generateId('group');

    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const targets = p.objects.filter((o) => ids.includes(o.id));
        if (targets.length < 2) return p;

        const bbox = calculateBoundingBox(targets);
        if (!bbox) return p;

        const groupObj: SceneObject = {
          id: groupId,
          name: `Group ${p.objects.filter((o) => o.type === 'group').length + 1}`,
          type: 'group',
          x: bbox.minX,
          y: bbox.minY,
          width: bbox.width,
          height: bbox.height,
          rotation: 0,
          opacity: 100,
          visible: true,
          locked: false,
          parentId: null,
          childIds: ids,
        };

        const updatedObjects = p.objects.map((o) =>
          ids.includes(o.id) ? ({ ...o, parentId: groupId } as SceneObject) : o
        );

        return { ...p, objects: [...updatedObjects, groupObj] };
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });

    return groupId;
  },

  ungroupObjects: (groupIds: string[]) => {
    const releasedIds: string[] = [];
    set((state) => {
      const activeId = state.doc.activePageId;
      const groupIdsSet = new Set(groupIds);

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const nextObjects: SceneObject[] = [];
        for (const obj of p.objects) {
          if (groupIdsSet.has(obj.id)) {
            continue;
          }
          if (obj.parentId && groupIdsSet.has(obj.parentId)) {
            releasedIds.push(obj.id);
            nextObjects.push({ ...obj, parentId: null } as SceneObject);
          } else {
            nextObjects.push(obj);
          }
        }

        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });

    return releasedIds;
  },

  alignObjects: (alignment: AlignmentType, selectedIds: string[]) => {
    if (selectedIds.length === 0) return;
    set((state) => {
      const activePage = state.doc.pages.find((p) => p.id === state.doc.activePageId);
      if (!activePage) return state;

      const targetObjects = activePage.objects.filter((o) => selectedIds.includes(o.id));
      if (targetObjects.length === 0) return state;

      const bbox = calculateBoundingBox(targetObjects);
      if (!bbox) return state;

      const updates: Record<string, Partial<SceneObject>> = {};

      if (alignment === 'left') {
        for (const obj of targetObjects) {
          updates[obj.id] = { x: bbox.minX };
        }
      } else if (alignment === 'center') {
        const midX = bbox.minX + bbox.width / 2;
        for (const obj of targetObjects) {
          updates[obj.id] = { x: midX - obj.width / 2 };
        }
      } else if (alignment === 'right') {
        for (const obj of targetObjects) {
          updates[obj.id] = { x: bbox.maxX - obj.width };
        }
      } else if (alignment === 'top') {
        for (const obj of targetObjects) {
          updates[obj.id] = { y: bbox.minY };
        }
      } else if (alignment === 'middle') {
        const midY = bbox.minY + bbox.height / 2;
        for (const obj of targetObjects) {
          updates[obj.id] = { y: midY - obj.height / 2 };
        }
      } else if (alignment === 'bottom') {
        for (const obj of targetObjects) {
          updates[obj.id] = { y: bbox.maxY - obj.height };
        }
      } else if (alignment === 'distribute-h' && targetObjects.length > 2) {
        const sorted = [...targetObjects].sort((a, b) => a.x - b.x);
        const totalObjWidth = sorted.reduce((sum, o) => sum + o.width, 0);
        const totalSpan = bbox.width;
        const availableGap = totalSpan - totalObjWidth;
        const gap = availableGap / (sorted.length - 1);
        let currX = bbox.minX;
        for (const obj of sorted) {
          updates[obj.id] = { x: currX };
          currX += obj.width + gap;
        }
      } else if (alignment === 'distribute-v' && targetObjects.length > 2) {
        const sorted = [...targetObjects].sort((a, b) => a.y - b.y);
        const totalObjHeight = sorted.reduce((sum, o) => sum + o.height, 0);
        const totalSpan = bbox.height;
        const availableGap = totalSpan - totalObjHeight;
        const gap = availableGap / (sorted.length - 1);
        let currY = bbox.minY;
        for (const obj of sorted) {
          updates[obj.id] = { y: currY };
          currY += obj.height + gap;
        }
      }

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== state.doc.activePageId) return p;
        const nextObjects = p.objects.map((obj) =>
          updates[obj.id] ? ({ ...obj, ...updates[obj.id] } as SceneObject) : obj
        );
        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  reparentObject: (objectId: string, newParentId: string | null) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const obj = p.objects.find((o) => o.id === objectId);
        if (!obj || obj.parentId === newParentId) return p;
        if (objectId === newParentId) return p;

        // Prevent circular parenting
        let currentParent = newParentId ? p.objects.find((o) => o.id === newParentId) : null;
        while (currentParent) {
          if (currentParent.id === objectId) return p; // Disallow cycle
          currentParent = currentParent.parentId
            ? p.objects.find((o) => o.id === currentParent!.parentId)
            : null;
        }

        // Compute absolute position before reparenting
        const getAbsolutePos = (targetId: string): { x: number; y: number } => {
          let curr = p.objects.find((o) => o.id === targetId);
          let absX = 0;
          let absY = 0;
          while (curr) {
            absX += curr.x;
            absY += curr.y;
            curr = curr.parentId ? p.objects.find((o) => o.id === curr!.parentId) : undefined;
          }
          return { x: absX, y: absY };
        };

        const targetAbs = getAbsolutePos(objectId);

        let newLocalX = targetAbs.x;
        let newLocalY = targetAbs.y;

        if (newParentId) {
          const parentAbs = getAbsolutePos(newParentId);
          newLocalX -= parentAbs.x;
          newLocalY -= parentAbs.y;
        }

        const nextObjects = p.objects.map((o) => {
          if (o.id === objectId) {
            return {
              ...o,
              parentId: newParentId,
              x: newLocalX,
              y: newLocalY,
            } as SceneObject;
          }
          return o;
        });

        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  recomputeLayout: () => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;
        return recomputePageLayout(p);
      });
      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      return { doc: nextDoc };
    });
  },

  resizeFrameWithConstraints: (frameId: string, newWidth: number, newHeight: number) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const frame = p.objects.find((o) => o.id === frameId);
        if (!frame || frame.type !== 'frame') return p;

        const frameObj = frame as FrameObject;
        const children = p.objects.filter((o) => o.parentId === frameId);

        let nextObjects = p.objects;

        // If not auto-layout, apply constraints resizing
        if (!frameObj.layoutMode || frameObj.layoutMode === 'none') {
          const childUpdates = applyFrameResizeConstraints(
            frameObj,
            children,
            Math.max(10, newWidth),
            Math.max(10, newHeight)
          );

          nextObjects = p.objects.map((o) => {
            if (o.id === frameId) {
              return { ...o, width: Math.max(10, newWidth), height: Math.max(10, newHeight) };
            }
            if (childUpdates[o.id]) {
              return { ...o, ...childUpdates[o.id] } as SceneObject;
            }
            return o;
          });
        } else {
          // Auto layout frame
          nextObjects = p.objects.map((o) => {
            if (o.id === frameId) {
              return { ...o, width: Math.max(10, newWidth), height: Math.max(10, newHeight) };
            }
            return o;
          });
        }

        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));

      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  // --- Phase 4 Design System Actions ---

  createComponent: (objectId: string, name?: string, category = 'Components') => {
    const { doc, getActivePage } = get();
    const activePage = getActivePage();
    const { nextDoc, componentId } = createMasterComponent(
      doc,
      activePage.id,
      objectId,
      name,
      category
    );

    set((state) => {
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });

    return componentId;
  },

  createInstance: (componentId: string, x: number, y: number, parentId: string | null = null) => {
    const { doc, getActivePage } = get();
    const activePage = getActivePage();
    const { nextDoc, instanceId } = createComponentInstance(
      doc,
      activePage.id,
      componentId,
      x,
      y,
      parentId
    );

    set((state) => {
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });

    return instanceId;
  },

  overrideInstanceProperty: (
    instanceId: string,
    targetMasterId: string,
    property: string,
    value: any
  ) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const instance = p.objects.find((o) => o.id === instanceId) as ComponentInstanceObject | undefined;
        if (!instance) return p;

        const currentOverrides = instance.overrides || {};
        const layerOverrides = currentOverrides[targetMasterId] || {};
        const nextOverrides = {
          ...currentOverrides,
          [targetMasterId]: {
            ...layerOverrides,
            [property]: value,
          },
        };

        const updatedObjects = p.objects.map((obj) => {
          if (obj.id === instanceId) {
            return { ...obj, overrides: nextOverrides } as SceneObject;
          }
          if (obj.masterObjectId === targetMasterId || obj.id === targetMasterId) {
            return { ...obj, [property]: value } as SceneObject;
          }
          return obj;
        });

        return recomputePageLayout({ ...p, objects: updatedObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  resetInstanceOverride: (instanceId: string, targetMasterId: string, property?: string) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const instance = p.objects.find((o) => o.id === instanceId) as ComponentInstanceObject | undefined;
        if (!instance || !instance.overrides) return p;

        const currentOverrides = { ...instance.overrides };
        if (property && currentOverrides[targetMasterId]) {
          delete currentOverrides[targetMasterId][property];
          if (Object.keys(currentOverrides[targetMasterId]).length === 0) {
            delete currentOverrides[targetMasterId];
          }
        } else {
          delete currentOverrides[targetMasterId];
        }

        const updatedObjects = p.objects.map((obj) =>
          obj.id === instanceId ? ({ ...obj, overrides: currentOverrides } as SceneObject) : obj
        );

        return recomputePageLayout({ ...p, objects: updatedObjects });
      });

      let nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      const instObj = state.getObjectById(instanceId) as ComponentInstanceObject | undefined;
      if (instObj?.componentId) {
        nextDoc = syncInstancesFromMaster(nextDoc, instObj.componentId);
      }

      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  resetAllInstanceOverrides: (instanceId: string) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const instObj = state.getObjectById(instanceId) as ComponentInstanceObject | undefined;
      if (!instObj?.componentId) return state;

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;
        const updatedObjects = p.objects.map((obj) =>
          obj.id === instanceId ? ({ ...obj, overrides: {} } as SceneObject) : obj
        );
        return recomputePageLayout({ ...p, objects: updatedObjects });
      });

      let nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
      nextDoc = syncInstancesFromMaster(nextDoc, instObj.componentId);

      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  detachInstance: (instanceId: string) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextDoc = detachComponentInstance(state.doc, activeId, instanceId);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  switchVariant: (instanceId: string, variantProps: Record<string, string>) => {
    set((state) => {
      const activeId = state.doc.activePageId;
      const nextDoc = switchInstanceVariant(state.doc, activeId, instanceId, variantProps);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  // Styles Actions
  createColorStyle: (name: string, color: string, opacity = 100, description?: string) => {
    const style = makeColorStyle(name, color, opacity, description);
    set((state) => {
      const currentStyles = state.doc.styles || { colorStyles: {}, textStyles: {}, effectStyles: {} };
      const nextStyles = {
        ...currentStyles,
        colorStyles: { ...currentStyles.colorStyles, [style.id]: style },
      };
      const nextDoc = { ...state.doc, styles: nextStyles, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
    return style.id;
  },

  updateColorStyle: (id: string, updates: Partial<ColorStyle>) => {
    set((state) => {
      const currentStyles = state.doc.styles;
      if (!currentStyles || !currentStyles.colorStyles[id]) return state;

      const updatedStyle = { ...currentStyles.colorStyles[id], ...updates };
      const nextStyles = {
        ...currentStyles,
        colorStyles: { ...currentStyles.colorStyles, [id]: updatedStyle },
      };

      // Cascade update to referencing objects
      const nextPages = state.doc.pages.map((p) => {
        const nextObjects = p.objects.map((obj) => {
          let updatedObj: any = obj;
          if (obj.fillStyleId === id && updates.color) {
            updatedObj = { ...updatedObj, fill: updates.color, opacity: updates.opacity ?? updatedObj.opacity };
          }
          if (obj.strokeStyleId === id && updates.color) {
            updatedObj = { ...updatedObj, stroke: updates.color, strokeOpacity: updates.opacity ?? updatedObj.strokeOpacity };
          }
          return updatedObj as SceneObject;
        });
        return { ...p, objects: nextObjects };
      });

      const nextDoc = { ...state.doc, styles: nextStyles, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deleteColorStyle: (id: string) => {
    set((state) => {
      const currentStyles = state.doc.styles;
      if (!currentStyles) return state;

      const nextColorStyles = { ...currentStyles.colorStyles };
      delete nextColorStyles[id];

      // Remove style references from scene objects safely (preserve raw color)
      const nextPages = state.doc.pages.map((p) => {
        const nextObjects = p.objects.map((obj) => {
          let updatedObj = obj;
          if (obj.fillStyleId === id) {
            const copy = { ...updatedObj };
            delete copy.fillStyleId;
            updatedObj = copy;
          }
          if (obj.strokeStyleId === id) {
            const copy = { ...updatedObj };
            delete copy.strokeStyleId;
            updatedObj = copy;
          }
          return updatedObj;
        });
        return { ...p, objects: nextObjects };
      });

      const nextDoc = {
        ...state.doc,
        styles: { ...currentStyles, colorStyles: nextColorStyles },
        pages: nextPages,
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  createTextStyle: (name: string, params: Omit<TextStyle, 'id' | 'name'>) => {
    const style = makeTextStyle(name, params);
    set((state) => {
      const currentStyles = state.doc.styles || { colorStyles: {}, textStyles: {}, effectStyles: {} };
      const nextStyles = {
        ...currentStyles,
        textStyles: { ...currentStyles.textStyles, [style.id]: style },
      };
      const nextDoc = { ...state.doc, styles: nextStyles, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
    return style.id;
  },

  updateTextStyle: (id: string, updates: Partial<TextStyle>) => {
    set((state) => {
      const currentStyles = state.doc.styles;
      if (!currentStyles || !currentStyles.textStyles[id]) return state;

      const updatedStyle = { ...currentStyles.textStyles[id], ...updates };
      const nextStyles = {
        ...currentStyles,
        textStyles: { ...currentStyles.textStyles, [id]: updatedStyle },
      };

      const nextPages = state.doc.pages.map((p) => {
        const nextObjects = p.objects.map((obj) => {
          if (obj.type === 'text' && obj.textStyleId === id) {
            return {
              ...obj,
              fontFamily: updates.fontFamily ?? (obj as any).fontFamily,
              fontSize: updates.fontSize ?? (obj as any).fontSize,
              fontWeight: updates.fontWeight ?? (obj as any).fontWeight,
              lineHeight: updates.lineHeight ?? (obj as any).lineHeight,
              letterSpacing: updates.letterSpacing ?? (obj as any).letterSpacing,
            };
          }
          return obj;
        });
        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, styles: nextStyles, pages: nextPages, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deleteTextStyle: (id: string) => {
    set((state) => {
      const currentStyles = state.doc.styles;
      if (!currentStyles) return state;

      const nextTextStyles = { ...currentStyles.textStyles };
      delete nextTextStyles[id];

      const nextPages = state.doc.pages.map((p) => {
        const nextObjects = p.objects.map((obj) => {
          if (obj.textStyleId === id) {
            const copy = { ...obj };
            delete copy.textStyleId;
            return copy as SceneObject;
          }
          return obj;
        });
        return { ...p, objects: nextObjects };
      });

      const nextDoc = {
        ...state.doc,
        styles: { ...currentStyles, textStyles: nextTextStyles },
        pages: nextPages,
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  createEffectStyle: (name: string, params: Omit<EffectStyle, 'id' | 'name'>) => {
    const style = makeEffectStyle(name, params);
    set((state) => {
      const currentStyles = state.doc.styles || { colorStyles: {}, textStyles: {}, effectStyles: {} };
      const nextStyles = {
        ...currentStyles,
        effectStyles: { ...currentStyles.effectStyles, [style.id]: style },
      };
      const nextDoc = { ...state.doc, styles: nextStyles, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
    return style.id;
  },

  updateEffectStyle: (id: string, updates: Partial<EffectStyle>) => {
    set((state) => {
      const currentStyles = state.doc.styles;
      if (!currentStyles || !currentStyles.effectStyles[id]) return state;

      const updated = { ...currentStyles.effectStyles[id], ...updates };
      const nextStyles = {
        ...currentStyles,
        effectStyles: { ...currentStyles.effectStyles, [id]: updated },
      };

      const nextDoc = { ...state.doc, styles: nextStyles, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deleteEffectStyle: (id: string) => {
    set((state) => {
      const currentStyles = state.doc.styles;
      if (!currentStyles) return state;

      const nextEffectStyles = { ...currentStyles.effectStyles };
      delete nextEffectStyles[id];

      const nextDoc = {
        ...state.doc,
        styles: { ...currentStyles, effectStyles: nextEffectStyles },
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  // Variables Actions
  createVariable: (
    name: string,
    type: VariableType,
    valuesByMode: Record<string, any>,
    collectionId = 'col_tokens_default',
    description?: string
  ) => {
    const currentVars = get().doc.variables || {
      variables: {},
      collections: {},
      activeModeIdByCollection: {},
    };
    const { nextState, newVariable } = makeVariable(
      name,
      type,
      valuesByMode,
      collectionId,
      currentVars,
      description
    );

    set((state) => {
      const nextDoc = { ...state.doc, variables: nextState, updatedAt: Date.now() };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });

    return newVariable.id;
  },

  updateVariable: (id: string, updates: Partial<Variable>) => {
    set((state) => {
      const currentVars = state.doc.variables;
      if (!currentVars || !currentVars.variables[id]) return state;

      const updated = { ...currentVars.variables[id], ...updates };
      const nextVariablesState = {
        ...currentVars,
        variables: { ...currentVars.variables, [id]: updated },
      };

      // Cascade variable value changes (e.g. Color / Spacing) to referencing objects
      const nextPages = state.doc.pages.map((p) => {
        const nextObjects = p.objects.map((obj) => {
          let updatedObj: any = obj;
          if (obj.fillVariableId === id) {
            const val = Object.values(updated.valuesByMode)[0];
            if (typeof val === 'string') updatedObj = { ...updatedObj, fill: val };
          }
          if (obj.strokeVariableId === id) {
            const val = Object.values(updated.valuesByMode)[0];
            if (typeof val === 'string') updatedObj = { ...updatedObj, stroke: val };
          }
          return updatedObj as SceneObject;
        });
        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = {
        ...state.doc,
        variables: nextVariablesState,
        pages: nextPages,
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deleteVariable: (id: string) => {
    set((state) => {
      const currentVars = state.doc.variables;
      if (!currentVars) return state;

      const nextVars = { ...currentVars.variables };
      delete nextVars[id];

      const nextDoc = {
        ...state.doc,
        variables: { ...currentVars, variables: nextVars },
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  setCollectionActiveMode: (collectionId: string, modeId: string) => {
    set((state) => {
      const currentVars = state.doc.variables;
      if (!currentVars) return state;

      const nextModes = {
        ...currentVars.activeModeIdByCollection,
        [collectionId]: modeId,
      };

      const nextVariablesState = {
        ...currentVars,
        activeModeIdByCollection: nextModes,
      };

      // Recompute page layout and style values for the new active mode
      const nextPages = state.doc.pages.map((p) => {
        const nextObjects = p.objects.map((obj) => {
          let updatedObj: any = obj;
          if (obj.fillVariableId) {
            const v = currentVars.variables[obj.fillVariableId];
            if (v && v.valuesByMode[modeId] !== undefined) {
              updatedObj = { ...updatedObj, fill: v.valuesByMode[modeId] };
            }
          }
          return updatedObj as SceneObject;
        });
        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = {
        ...state.doc,
        variables: nextVariablesState,
        pages: nextPages,
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return { doc: nextDoc };
    });
  },

  // Prototyping Actions
  createFlow: (name: string, startingPointId: string, description?: string) => {
    let flowId = '';
    set((state) => {
      const res = makeFlow(state.doc, name, startingPointId, description);
      flowId = res.flowId;
      saveDocumentToStorage(res.nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: res.nextDoc,
      };
    });
    return flowId;
  },

  updateFlow: (flowId: string, updates: Partial<PrototypeFlow>) => {
    set((state) => {
      const nextDoc = modifyFlow(state.doc, flowId, updates);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deleteFlow: (flowId: string) => {
    set((state) => {
      const nextDoc = removeFlow(state.doc, flowId);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  setStartingPoint: (frameId: string, flowName = 'Main Flow') => {
    let flowId = '';
    set((state) => {
      const res = assignStartingPoint(state.doc, frameId, flowName);
      flowId = res.flowId;
      saveDocumentToStorage(res.nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: res.nextDoc,
      };
    });
    return flowId;
  },

  addInteraction: (interaction: Omit<PrototypeInteraction, 'id'>) => {
    let interactionId = '';
    set((state) => {
      const res = makeInteraction(state.doc, interaction);
      interactionId = res.interactionId;
      saveDocumentToStorage(res.nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: res.nextDoc,
      };
    });
    return interactionId;
  },

  updateInteraction: (
    sourceNodeId: string,
    interactionId: string,
    updates: Partial<PrototypeInteraction>
  ) => {
    set((state) => {
      const nextDoc = modifyInteraction(state.doc, sourceNodeId, interactionId, updates);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  deleteInteraction: (sourceNodeId: string, interactionId: string) => {
    set((state) => {
      const nextDoc = removeInteraction(state.doc, sourceNodeId, interactionId);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  createConnection: (
    sourceId: string,
    destId: string,
    trigger: PrototypeTrigger = 'on-click',
    action: PrototypeAction = 'navigate-to',
    transition: PrototypeTransition = { type: 'dissolve', duration: 300, easing: 'ease-out' },
    overlay?: OverlayConfig
  ) => {
    let connectionId = '';
    set((state) => {
      const res = makeConnection(state.doc, sourceId, destId, trigger, action, transition, overlay);
      connectionId = res.connectionId;
      saveDocumentToStorage(res.nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: res.nextDoc,
      };
    });
    return connectionId;
  },

  deleteConnection: (connectionId: string) => {
    set((state) => {
      const nextDoc = removeConnection(state.doc, connectionId);
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return {
        past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
        future: [],
        doc: nextDoc,
      };
    });
  },

  updatePrototypeSettings: (settings: Partial<PrototypeSettings>) => {
    set((state) => {
      const currentProto = state.doc.prototype || createDefaultPrototypeData();
      const nextDoc = {
        ...state.doc,
        prototype: {
          ...currentProto,
          settings: { ...currentProto.settings, ...settings },
        },
        updatedAt: Date.now(),
      };
      saveDocumentToStorage(nextDoc, (status) => get().setSaveStatus(status));
      return { doc: nextDoc };
    });
  },

  commitHistory: () => {
    set((state) => ({
      past: [...state.past.slice(-MAX_HISTORY), cloneDoc(state.doc)],
      future: [],
    }));
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const newFuture = [cloneDoc(state.doc), ...state.future];

      saveDocumentToStorage(previous, (status) => get().setSaveStatus(status));
      return {
        past: newPast,
        future: newFuture,
        doc: previous,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const newPast = [...state.past, cloneDoc(state.doc)];

      saveDocumentToStorage(next, (status) => get().setSaveStatus(status));
      return {
        past: newPast,
        future: newFuture,
        doc: next,
      };
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  save: () => {
    get().setSaveStatus('saving');
    const success = saveDocumentImmediate(get().doc);
    get().setSaveStatus(success ? 'saved' : 'error');
  },
}));
