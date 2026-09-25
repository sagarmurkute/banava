import { create } from 'zustand';

interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
  
  select: (id: string, multi?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  deselectAll: () => void;
  setHovered: (id: string | null) => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: [],
  hoveredId: null,

  select: (id: string, multi = false) => {
    set((state) => {
      if (multi) {
        const already = state.selectedIds.includes(id);
        return {
          selectedIds: already
            ? state.selectedIds.filter((item) => item !== id)
            : [...state.selectedIds, id],
        };
      }
      return { selectedIds: [id] };
    });
  },

  selectMultiple: (ids: string[]) => {
    set({ selectedIds: ids });
  },

  deselectAll: () => {
    set({ selectedIds: [] });
  },

  setHovered: (id: string | null) => {
    set({ hoveredId: id });
  },

  isSelected: (id: string) => {
    return get().selectedIds.includes(id);
  },
}));
