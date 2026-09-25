export type ObjectType = 'frame' | 'rectangle' | 'ellipse' | 'line' | 'text';

export interface BaseSceneObject {
  id: string;
  name: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees 0-360
  opacity: number; // 0 to 100
  visible: boolean;
  locked: boolean;
  parentId: string | null; // if nested inside a frame
}

export interface RectangleObject extends BaseSceneObject {
  type: 'rectangle';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius: number;
}

export interface FrameObject extends BaseSceneObject {
  type: 'frame';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius: number;
  clipsContent: boolean;
}

export interface EllipseObject extends BaseSceneObject {
  type: 'ellipse';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface LineObject extends BaseSceneObject {
  type: 'line';
  stroke: string;
  strokeWidth: number;
}

export interface TextObject extends BaseSceneObject {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: number | string;
  fontFamily: string;
  fill: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
}

export type SceneObject =
  | RectangleObject
  | FrameObject
  | EllipseObject
  | LineObject
  | TextObject;

export interface Page {
  id: string;
  name: string;
  objects: SceneObject[];
}

export interface DocumentModel {
  version: number;
  id: string;
  name: string;
  pages: Page[];
  activePageId: string;
  createdAt: number;
  updatedAt: number;
}

export type ToolType = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'text';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type ResizeHandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type AlignmentType =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v';
