import { create } from 'zustand';
import type { EditorMode } from '../types/document';

interface UIState {
  editorMode: EditorMode;
  leftSidebarTab: 'layers' | 'pages';
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
  statusMessage: string | null;
  isPresenting: boolean;
  activePresentFlowId: string | null;
  showConnectionLines: boolean;
  
  setEditorMode: (mode: EditorMode) => void;
  setLeftSidebarTab: (tab: 'layers' | 'pages') => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
  setShowRulers: (show: boolean) => void;
  toggleRulers: () => void;
  setSnapToGrid: (snap: boolean) => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  setStatusMessage: (msg: string | null) => void;
  setIsPresenting: (presenting: boolean, flowId?: string | null) => void;
  setShowConnectionLines: (show: boolean) => void;
  toggleConnectionLines: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  editorMode: 'design',
  leftSidebarTab: 'layers',
  showGrid: true,
  showRulers: true,
  snapToGrid: false,
  gridSize: 10,
  statusMessage: null,
  isPresenting: false,
  activePresentFlowId: null,
  showConnectionLines: true,

  setEditorMode: (mode) => set({ editorMode: mode }),
  setLeftSidebarTab: (tab) => set({ leftSidebarTab: tab }),
  setShowGrid: (show) => set({ showGrid: show }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setShowRulers: (show) => set({ showRulers: show }),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  setGridSize: (size) => set({ gridSize: size }),
  setStatusMessage: (msg) => {
    set({ statusMessage: msg });
    if (msg) {
      setTimeout(() => {
        set((current) => (current.statusMessage === msg ? { statusMessage: null } : {}));
      }, 2500);
    }
  },
  setIsPresenting: (presenting, flowId = null) =>
    set({ isPresenting: presenting, activePresentFlowId: flowId }),
  setShowConnectionLines: (show) => set({ showConnectionLines: show }),
  toggleConnectionLines: () => set((s) => ({ showConnectionLines: !s.showConnectionLines })),
}));
