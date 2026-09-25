import { create } from 'zustand';
import type { ViewportState, SceneObject } from '../types/document';
import { loadViewportFromStorage, saveViewportToStorage } from '../storage/localStorage';
import { calculateBoundingBox, clamp } from '../utils/geometry';

interface ViewportStoreState extends ViewportState {
  setViewport: (viewport: Partial<ViewportState>) => void;
  pan: (dx: number, dy: number) => void;
  zoomTo: (targetZoom: number, cursorScreenX?: number, cursorScreenY?: number, containerRect?: { left: number; top: number; width: number; height: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: (centerX?: number, centerY?: number) => void;
  fitToScreen: (objects: SceneObject[], containerWidth: number, containerHeight: number) => void;
}

const initialViewport = loadViewportFromStorage();

export const useViewportStore = create<ViewportStoreState>((set, get) => ({
  x: initialViewport.x,
  y: initialViewport.y,
  zoom: initialViewport.zoom,

  setViewport: (partial) => {
    set((state) => {
      const next = { ...state, ...partial };
      saveViewportToStorage({ x: next.x, y: next.y, zoom: next.zoom });
      return partial;
    });
  },

  pan: (dx: number, dy: number) => {
    set((state) => {
      const nextX = state.x + dx;
      const nextY = state.y + dy;
      saveViewportToStorage({ x: nextX, y: nextY, zoom: state.zoom });
      return { x: nextX, y: nextY };
    });
  },

  zoomTo: (targetZoom, cursorScreenX, cursorScreenY, containerRect) => {
    set((state) => {
      const clampedZoom = clamp(targetZoom, 0.05, 10.0);
      
      if (cursorScreenX !== undefined && cursorScreenY !== undefined && containerRect) {
        // Zoom anchored at cursor
        const mouseX = cursorScreenX - containerRect.left;
        const mouseY = cursorScreenY - containerRect.top;

        // Current world coords under mouse
        const worldX = (mouseX - state.x) / state.zoom;
        const worldY = (mouseY - state.y) / state.zoom;

        // New viewport pan so worldX, worldY stay under mouse
        const nextX = mouseX - worldX * clampedZoom;
        const nextY = mouseY - worldY * clampedZoom;

        saveViewportToStorage({ x: nextX, y: nextY, zoom: clampedZoom });
        return { x: nextX, y: nextY, zoom: clampedZoom };
      }

      saveViewportToStorage({ x: state.x, y: state.y, zoom: clampedZoom });
      return { zoom: clampedZoom };
    });
  },

  zoomIn: () => {
    const current = get().zoom;
    get().zoomTo(current * 1.25);
  },

  zoomOut: () => {
    const current = get().zoom;
    get().zoomTo(current / 1.25);
  },

  resetZoom: () => {
    set({ zoom: 1.0 });
    saveViewportToStorage({ x: get().x, y: get().y, zoom: 1.0 });
  },

  fitToScreen: (objects: SceneObject[], containerWidth: number, containerHeight: number) => {
    const visibleObjects = objects.filter((o) => o.visible);
    if (visibleObjects.length === 0) {
      set({ x: containerWidth / 2 - 190, y: containerHeight / 2 - 300, zoom: 1.0 });
      return;
    }

    const bbox = calculateBoundingBox(visibleObjects);
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) return;

    const padding = 60;
    const availWidth = Math.max(containerWidth - padding * 2, 100);
    const availHeight = Math.max(containerHeight - padding * 2, 100);

    const scaleX = availWidth / bbox.width;
    const scaleY = availHeight / bbox.height;
    const fitZoom = clamp(Math.min(scaleX, scaleY), 0.1, 2.0);

    const centerX = bbox.minX + bbox.width / 2;
    const centerY = bbox.minY + bbox.height / 2;

    const nextX = containerWidth / 2 - centerX * fitZoom;
    const nextY = containerHeight / 2 - centerY * fitZoom;

    set({ x: nextX, y: nextY, zoom: fitZoom });
    saveViewportToStorage({ x: nextX, y: nextY, zoom: fitZoom });
  },
}));
