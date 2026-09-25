import { create } from 'zustand';
import type { DocumentModel, Page, SceneObject, AlignmentType, Asset, SaveStatus, FrameObject } from '../types/document';
import { loadDocumentFromStorage, saveDocumentToStorage, saveDocumentImmediate } from '../storage/localStorage';
import { generateId } from '../utils/id';
import { calculateBoundingBox } from '../utils/geometry';
import { recomputePageLayout } from '../layout/layoutEngine';
import { applyFrameResizeConstraints } from '../layout/constraints';

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
      const pageExists = state.doc.pages.some((p) => p.id === pageId);
      if (!pageExists) return state;

      const nextDoc = { ...state.doc, activePageId: pageId, updatedAt: Date.now() };
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
          const updatedPage = recomputePageLayout({
            ...p,
            objects: [...p.objects, object],
          });
          return updatedPage;
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

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const nextObjects = p.objects.map((obj) => {
          if (obj.id === id) {
            hasChange = true;
            return { ...obj, ...updates } as SceneObject;
          }
          return obj;
        });

        // Run layout engine
        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      if (!hasChange) return state;

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
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

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;

        const nextObjects = p.objects.map((obj) => {
          if (updates[obj.id]) {
            return { ...obj, ...updates[obj.id] } as SceneObject;
          }
          return obj;
        });

        return recomputePageLayout({ ...p, objects: nextObjects });
      });

      const nextDoc = { ...state.doc, pages: nextPages, updatedAt: Date.now() };
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
      const idsSet = new Set(ids);

      const nextPages = state.doc.pages.map((p) => {
        if (p.id !== activeId) return p;
        const remaining = p.objects.filter((obj) => !idsSet.has(obj.id) && (!obj.parentId || !idsSet.has(obj.parentId)));
        return recomputePageLayout({ ...p, objects: remaining });
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
