import { create } from 'zustand';
import type { EditorMode } from '../types/document';

interface UIState {
  viewMode: 'editor' | 'dashboard';
  dashboardTab: 'recent' | 'projects' | 'folders' | 'templates' | 'trash';
  selectedProjectId: string | null;
  selectedFolderId: string | null;
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
  activeModal: 'none' | 'documentInfo' | 'snapshots' | 'recovery' | 'export';
  searchQuery: string;
  
  setViewMode: (mode: 'editor' | 'dashboard') => void;
  setDashboardTab: (tab: 'recent' | 'projects' | 'folders' | 'templates' | 'trash') => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedFolderId: (id: string | null) => void;
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
  setActiveModal: (modal: 'none' | 'documentInfo' | 'snapshots' | 'recovery' | 'export') => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'editor',
  dashboardTab: 'recent',
  selectedProjectId: null,
  selectedFolderId: null,
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
  activeModal: 'none',
  searchQuery: '',

  setViewMode: (mode) => set({ viewMode: mode }),
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id }),
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
  toggleConnectionLines: () =>
    set((s) => ({ showConnectionLines: !s.showConnectionLines })),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
