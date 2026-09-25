import type { SceneObject, FrameObject } from '../types/document';

export interface LayoutUpdate {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameLayoutResult {
  frameUpdates?: Partial<FrameObject>;
  childrenUpdates: Record<string, Partial<SceneObject>>;
}
