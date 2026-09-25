import type { BoundingBox, SceneObject, ViewportState } from '../types/document';

export function calculateBoundingBox(objects: SceneObject[]): BoundingBox | null {
  if (objects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const obj of objects) {
    if (!obj.visible) continue;
    
    // For rotated objects, calculate projected bounding box if rotated
    if (obj.rotation && obj.rotation !== 0) {
      const rad = (obj.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      
      const halfW = obj.width / 2;
      const halfH = obj.height / 2;
      
      const corners = [
        { x: -halfW, y: -halfH },
        { x: halfW, y: -halfH },
        { x: halfW, y: halfH },
        { x: -halfW, y: halfH },
      ];

      for (const corner of corners) {
        const rx = cx + corner.x * cos - corner.y * sin;
        const ry = cy + corner.x * sin + corner.y * cos;
        if (rx < minX) minX = rx;
        if (rx > maxX) maxX = rx;
        if (ry < minY) minY = ry;
        if (ry > maxY) maxY = ry;
      }
    } else {
      if (obj.x < minX) minX = obj.x;
      if (obj.y < minY) minY = obj.y;
      if (obj.x + obj.width > maxX) maxX = obj.x + obj.width;
      if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
    }
  }

  if (minX === Infinity) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  containerRect: { left: number; top: number }
): { x: number; y: number } {
  const relX = screenX - containerRect.left;
  const relY = screenY - containerRect.top;
  return {
    x: (relX - viewport.x) / viewport.zoom,
    y: (relY - viewport.y) / viewport.zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: ViewportState,
  containerRect: { left: number; top: number }
): { x: number; y: number } {
  return {
    x: canvasX * viewport.zoom + viewport.x + containerRect.left,
    y: canvasY * viewport.zoom + viewport.y + containerRect.top,
  };
}

export function isPointInObject(
  px: number,
  py: number,
  obj: SceneObject
): boolean {
  if (!obj.visible || obj.locked) return false;

  // Handle line special thickness check
  if (obj.type === 'line') {
    const pad = Math.max(obj.strokeWidth, 8);
    return (
      px >= obj.x - pad &&
      px <= obj.x + obj.width + pad &&
      py >= obj.y - pad &&
      py <= obj.y + obj.height + pad
    );
  }

  if (!obj.rotation || obj.rotation === 0) {
    return (
      px >= obj.x &&
      px <= obj.x + obj.width &&
      py >= obj.y &&
      py <= obj.y + obj.height
    );
  }

  // Handle rotated object: transform test point into local object space
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const rad = (-obj.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * cos - dy * sin + obj.width / 2;
  const localY = dx * sin + dy * cos + obj.height / 2;

  return (
    localX >= 0 &&
    localX <= obj.width &&
    localY >= 0 &&
    localY <= obj.height
  );
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function snap(val: number, step: number): number {
  return Math.round(val / step) * step;
}
