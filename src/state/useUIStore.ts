import { create } from 'zustand';

interface UIState {
  leftSidebarTab: 'layers' | 'pages';
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
  statusMessage: string | null;
  
  setLeftSidebarTab: (tab: 'layers' | 'pages') => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
  setShowRulers: (show: boolean) => void;
  toggleRulers: () => void;
  setSnapToGrid: (snap: boolean) => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  setStatusMessage: (msg: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  leftSidebarTab: 'layers',
  showGrid: true,
  showRulers: true,
  snapToGrid: false,
  gridSize: 10,
  statusMessage: null,

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
}));
