import { create } from 'zustand';
import type { SceneObject } from '../types/document';
import { generateId } from '../utils/id';
import { useDocumentStore } from './useDocumentStore';
import { useSelectionStore } from './useSelectionStore';
import { useUIStore } from './useUIStore';

interface ClipboardState {
  copiedObjects: SceneObject[];
  copy: (objects: SceneObject[]) => void;
  cut: (objects: SceneObject[]) => void;
  paste: (targetX?: number, targetY?: number) => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  copiedObjects: [],

  copy: (objects: SceneObject[]) => {
    if (objects.length === 0) return;
    const cloned = JSON.parse(JSON.stringify(objects));
    set({ copiedObjects: cloned });
    useUIStore.getState().setStatusMessage(`Copied ${objects.length} object(s)`);
  },

  cut: (objects: SceneObject[]) => {
    if (objects.length === 0) return;
    const cloned = JSON.parse(JSON.stringify(objects));
    set({ copiedObjects: cloned });
    const ids = objects.map((o) => o.id);
    useDocumentStore.getState().deleteObjects(ids);
    useSelectionStore.getState().deselectAll();
    useUIStore.getState().setStatusMessage(`Cut ${objects.length} object(s)`);
  },

  paste: (targetX?: number, targetY?: number) => {
    const { copiedObjects } = get();
    if (copiedObjects.length === 0) return;

    const newObjects: SceneObject[] = [];
    const newIds: string[] = [];

    // If target position is provided, calculate offset from first object
    const baseObj = copiedObjects[0];
    const offsetX = targetX !== undefined ? targetX - baseObj.x : 20;
    const offsetY = targetY !== undefined ? targetY - baseObj.y : 20;

    for (const orig of copiedObjects) {
      const newId = generateId(orig.type);
      newIds.push(newId);
      const cloned: SceneObject = JSON.parse(JSON.stringify(orig));
      cloned.id = newId;
      cloned.name = `${orig.name} Copy`;
      cloned.x = orig.x + offsetX;
      cloned.y = orig.y + offsetY;
      cloned.parentId = null; // paste at root unless configured
      newObjects.push(cloned);
      useDocumentStore.getState().addObject(cloned);
    }

    useSelectionStore.getState().selectMultiple(newIds);
    useUIStore.getState().setStatusMessage(`Pasted ${newObjects.length} object(s)`);
  },
}));
