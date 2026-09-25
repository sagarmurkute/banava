export type ObjectType =
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'text'
  | 'image'
  | 'group';

export type TextAutoResize = 'auto-width' | 'auto-height' | 'fixed';

export type StrokeAlign = 'center' | 'inside' | 'outside';

export type LineCap = 'butt' | 'round' | 'square';

export interface SolidFill {
  type: 'solid';
  color: string;
  opacity: number; // 0 - 100
}

export type Fill = SolidFill;

export interface StrokeStyle {
  color: string;
  width: number;
  opacity: number; // 0 - 100
  align: StrokeAlign;
  lineCap?: LineCap;
}

export interface Asset {
  id: string;
  type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  name: string;
  width: number;
  height: number;
  dataUrl?: string; // in-memory / cache data URL
  createdAt: number;
}

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
  parentId: string | null; // if nested inside a frame or group
}

export interface RectangleObject extends BaseSceneObject {
  type: 'rectangle';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeAlign?: StrokeAlign;
  cornerRadius: number;
}

export interface FrameObject extends BaseSceneObject {
  type: 'frame';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  cornerRadius: number;
  clipsContent: boolean;
}

export interface EllipseObject extends BaseSceneObject {
  type: 'ellipse';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

export interface PolygonObject extends BaseSceneObject {
  type: 'polygon';
  points: number; // e.g. 3 for triangle, 5 for pentagon/star
  isStar?: boolean;
  starRatio?: number; // 0.1 - 0.9 for inner radius ratio
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  cornerRadius?: number;
}

export interface LineObject extends BaseSceneObject {
  type: 'line';
  stroke: string;
  strokeWidth: number;
  strokeOpacity?: number;
  lineCap?: LineCap;
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
  letterSpacing: number; // in px
  autoResize: TextAutoResize;
}

export interface ImageObject extends BaseSceneObject {
  type: 'image';
  assetId: string;
  src?: string; // cached preview URL
  cornerRadius: number;
  aspectRatio: number;
  fit: 'cover' | 'contain' | 'fill';
}

export interface GroupObject extends BaseSceneObject {
  type: 'group';
  childIds: string[];
}

export type SceneObject =
  | RectangleObject
  | FrameObject
  | EllipseObject
  | PolygonObject
  | LineObject
  | TextObject
  | ImageObject
  | GroupObject;

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
  assets: Record<string, Asset>;
  createdAt: number;
  updatedAt: number;
}

export type ToolType =
  | 'select'
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'text'
  | 'image';

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

export interface SmartGuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  type: 'edge' | 'center';
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
