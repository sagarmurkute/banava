import { create } from 'zustand';
import type { ToolType } from '../types/document';

interface ToolState {
  activeTool: ToolType;
  isSpacePressed: boolean;
  setActiveTool: (tool: ToolType) => void;
  setIsSpacePressed: (pressed: boolean) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'select',
  isSpacePressed: false,

  setActiveTool: (tool: ToolType) => {
    set({ activeTool: tool });
  },

  setIsSpacePressed: (pressed: boolean) => {
    set({ isSpacePressed: pressed });
  },
}));
