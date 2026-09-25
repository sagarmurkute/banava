export type ObjectType =
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'text'
  | 'image'
  | 'group'
  | 'instance';

export type LayoutMode = 'none' | 'horizontal' | 'vertical';

export type LayoutAlignment = 'start' | 'center' | 'end' | 'stretch';

export type LayoutDistribution = 'packed' | 'space-between';

export type LayoutWrap = 'none' | 'wrap';

export type SizingMode = 'fixed' | 'hug' | 'fill';

export type HorizontalConstraint = 'left' | 'right' | 'left-right' | 'center' | 'scale';
export type VerticalConstraint = 'top' | 'bottom' | 'top-bottom' | 'center' | 'scale';

export type ConstraintHorizontal = HorizontalConstraint;
export type ConstraintVertical = VerticalConstraint;

export interface Constraints {
  horizontal: HorizontalConstraint;
  vertical: VerticalConstraint;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutGridConfig {
  id?: string;
  enabled?: boolean;
  visible?: boolean;
  type: 'columns' | 'rows' | 'grid';
  count?: number;
  gutter?: number;
  margin?: number;
  color?: string;
}

export type TextAutoResize = 'auto-width' | 'auto-height' | 'fixed';

export type StrokeAlign = 'center' | 'inside' | 'outside';

export type LineCap = 'butt' | 'round' | 'square';

export interface SolidFill {
  type: 'solid';
  color: string;
  opacity: number;
}

export type Fill = SolidFill;

export interface Asset {
  id: string;
  type: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  name: string;
  width: number;
  height: number;
  dataUrl?: string;
  createdAt: number;
}

// Design System Style Definitions
export interface ColorStyle {
  id: string;
  name: string;
  color: string;
  opacity: number;
  description?: string;
}

export interface TextStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  lineHeight: number;
  letterSpacing: number;
  description?: string;
}

export interface EffectStyle {
  id: string;
  name: string;
  type: 'drop-shadow' | 'inner-shadow' | 'blur';
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity?: number;
  description?: string;
}

// Design Token / Variable Definitions
export interface VariableMode {
  id: string;
  name: string;
}

export type VariableType = 'color' | 'number' | 'string' | 'boolean';

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  valuesByMode: Record<string, any>;
  description?: string;
}

export interface VariableCollection {
  id: string;
  name: string;
  modes: VariableMode[];
  defaultModeId: string;
  variableIds: string[];
}

// Component & Property Definitions
export type ComponentPropertyType = 'boolean' | 'text' | 'variant' | 'instance-swap';

export interface ComponentPropertyDefinition {
  id: string;
  name: string;
  type: ComponentPropertyType;
  defaultValue: any;
  options?: string[]; // for variant property choices
  targetLayerId?: string; // target layer this property maps to
  targetProperty?: 'visible' | 'content' | 'fill' | 'stroke';
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  description?: string;
  rootObjectId: string;
  componentSetId?: string;
  variantProperties?: Record<string, string>;
  exposedProperties?: ComponentPropertyDefinition[];
  createdAt: number;
  updatedAt: number;
}

export interface ComponentSet {
  id: string;
  name: string;
  category: string;
  description?: string;
  variantPropertyNames: string[];
  componentIds: string[];
  createdAt: number;
  updatedAt: number;
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

  // Sizing & Constraints (Phase 3)
  sizingHorizontal?: SizingMode;
  sizingVertical?: SizingMode;
  constraints?: Constraints;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  alignSelf?: LayoutAlignment;

  // Design System References (Phase 4)
  isComponent?: boolean;
  componentId?: string; // If this object is the root of a Master Component
  masterObjectId?: string; // If this object is inside an instance, maps to master layer ID
  fillStyleId?: string;
  strokeStyleId?: string;
  textStyleId?: string;
  effectStyleId?: string;
  fillVariableId?: string;
  strokeVariableId?: string;
  paddingVariableId?: string;
  gapVariableId?: string;

  // Export Settings (Phase 6)
  exportSettings?: ExportSetting[];
}

export interface FrameObject extends BaseSceneObject {
  type: 'frame';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  cornerRadius?: number;
  clipsContent?: boolean;

  // Auto Layout Properties
  layoutMode?: LayoutMode;
  itemSpacing?: number; // gap
  padding?: Padding;
  primaryAxisAlignItems?: 'start' | 'center' | 'end' | 'space-between';
  counterAxisAlignItems?: 'start' | 'center' | 'end' | 'stretch';
  layoutWrap?: LayoutWrap;

  // Layout Grid (Columns / Rows)
  layoutGrids?: LayoutGridConfig[];
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

export interface EllipseObject extends BaseSceneObject {
  type: 'ellipse';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

export interface PolygonObject extends BaseSceneObject {
  type: 'polygon';
  points: number;
  isStar?: boolean;
  starRatio?: number;
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
  letterSpacing: number;
  autoResize: TextAutoResize;
}

export interface ImageObject extends BaseSceneObject {
  type: 'image';
  assetId: string;
  src?: string;
  cornerRadius: number;
  aspectRatio: number;
  fit: 'cover' | 'contain' | 'fill';
}

export interface GroupObject extends BaseSceneObject {
  type: 'group';
  childIds: string[];
}

export interface ComponentInstanceObject extends BaseSceneObject {
  type: 'instance';
  componentId: string; // ID of Master ComponentDefinition
  variantProperties?: Record<string, string>;
  overrides?: Record<string, Record<string, any>>; // relative layer id -> property overrides
  propertyValues?: Record<string, any>; // values for exposed component properties
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  clipsContent?: boolean;
  layoutMode?: LayoutMode;
  itemSpacing?: number;
  padding?: Padding;
  primaryAxisAlignItems?: 'start' | 'center' | 'end' | 'space-between';
  counterAxisAlignItems?: 'start' | 'center' | 'end' | 'stretch';
  layoutGrids?: LayoutGridConfig[];
}

export type SceneObject =
  | RectangleObject
  | FrameObject
  | EllipseObject
  | PolygonObject
  | LineObject
  | TextObject
  | ImageObject
  | GroupObject
  | ComponentInstanceObject;

export interface Page {
  id: string;
  name: string;
  objects: SceneObject[];
}

export interface DesignSystemStyles {
  colorStyles: Record<string, ColorStyle>;
  textStyles: Record<string, TextStyle>;
  effectStyles: Record<string, EffectStyle>;
}

export interface DesignSystemVariables {
  variables: Record<string, Variable>;
  collections: Record<string, VariableCollection>;
  activeModeIdByCollection: Record<string, string>;
}

import type { PrototypeDocumentData } from '../prototype/types';
import type { BanavaDocumentMetadata, DocumentSnapshot, ExportSetting } from '../documents/types';
export * from '../prototype/types';
export * from '../documents/types';

export interface DocumentModel {
  version: number;
  id: string;
  name: string;
  pages: Page[];
  activePageId: string;
  assets: Record<string, Asset>;
  // Phase 4 Design System additions
  components?: Record<string, ComponentDefinition>;
  componentSets?: Record<string, ComponentSet>;
  styles?: DesignSystemStyles;
  variables?: DesignSystemVariables;
  // Phase 5 Prototype additions
  prototype?: PrototypeDocumentData;
  // Phase 6 File & Document additions
  metadata?: BanavaDocumentMetadata;
  snapshots?: DocumentSnapshot[];
  exportSettings?: ExportSetting[];
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
  | 'text';

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
