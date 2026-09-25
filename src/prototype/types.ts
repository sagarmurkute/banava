export type EditorMode = 'design' | 'prototype';

export type PrototypeTrigger =
  | 'on-click'
  | 'on-tap'
  | 'while-hovering'
  | 'while-pressing'
  | 'on-drag'
  | 'on-key-press'
  | 'after-delay';

export type PrototypeAction =
  | 'navigate-to'
  | 'back'
  | 'open-overlay'
  | 'close-overlay'
  | 'swap-overlay'
  | 'scroll-to'
  | 'open-url'
  | 'set-variable';

export type TransitionType =
  | 'instant'
  | 'dissolve'
  | 'smart-animate'
  | 'move-in'
  | 'move-out'
  | 'push'
  | 'slide-in'
  | 'slide-out';

export type TransitionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type TransitionDirection = 'left' | 'right' | 'top' | 'bottom';

export interface PrototypeTransition {
  type: TransitionType;
  duration: number; // in milliseconds (e.g. 300)
  easing: TransitionEasing;
  direction?: TransitionDirection;
  matchLayers?: boolean;
}

export type OverlayPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'manual';

export interface OverlayConfig {
  position: OverlayPosition;
  manualX?: number;
  manualY?: number;
  backdropEnabled: boolean;
  backdropColor: string;
  backdropOpacity: number; // 0 to 100
  closeOnOutsideClick: boolean;
  closeOnEscape: boolean;
}

export type ScrollOverflow = 'none' | 'vertical' | 'horizontal' | 'both';

export interface ScrollConfig {
  overflow: ScrollOverflow;
  scrollToTargetId?: string;
  offsetY?: number;
}

export interface PrototypeVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: any;
  currentValue?: any;
}

export interface VariableUpdateAction {
  variableId: string;
  operation: 'set' | 'toggle' | 'increment' | 'decrement';
  value: any;
}

export interface PrototypeInteraction {
  id: string;
  sourceNodeId: string;
  trigger: PrototypeTrigger;
  action: PrototypeAction;
  destinationNodeId?: string;
  transition?: PrototypeTransition;
  overlay?: OverlayConfig;
  scroll?: ScrollConfig;
  url?: string;
  delayMs?: number;
  keyTrigger?: string;
  variableUpdates?: VariableUpdateAction[];
  enabled: boolean;
}

export interface PrototypeConnection {
  id: string;
  sourceNodeId: string;
  sourceEvent: PrototypeTrigger;
  action: PrototypeAction;
  destinationNodeId?: string;
  transition?: PrototypeTransition;
  overlay?: OverlayConfig;
  scroll?: ScrollConfig;
  url?: string;
  enabled: boolean;
}

export interface PrototypeFlow {
  id: string;
  name: string;
  startingPointId: string; // Target starting frame ID
  description?: string;
}

export type DevicePreset = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface DeviceViewportDimensions {
  name: string;
  width: number;
  height: number;
}

export const DEVICE_PRESETS: Record<DevicePreset, DeviceViewportDimensions> = {
  desktop: { name: 'Desktop (1440 × 900)', width: 1440, height: 900 },
  tablet: { name: 'Tablet (1024 × 768)', width: 1024, height: 768 },
  mobile: { name: 'iPhone 15 (390 × 844)', width: 390, height: 844 },
  custom: { name: 'Custom Viewport', width: 1200, height: 800 },
};

export interface PrototypeSettings {
  devicePreset: DevicePreset;
  customWidth: number;
  customHeight: number;
  showHotspots: boolean;
  theme: 'dark' | 'light';
}

export interface PrototypeDocumentData {
  flows: Record<string, PrototypeFlow>;
  connections: Record<string, PrototypeConnection>;
  interactions: Record<string, PrototypeInteraction[]>; // sourceNodeId -> interaction array
  variables: Record<string, PrototypeVariable>;
  settings: PrototypeSettings;
}
