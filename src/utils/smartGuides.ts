import type { SceneObject, SmartGuideLine } from '../types/document';

interface SnapResult {
  x: number;
  y: number;
  guides: SmartGuideLine[];
}

const SNAP_THRESHOLD = 6; // in canvas coordinate units

export function calculateSmartGuidesAndSnap(
  draggedObj: { x: number; y: number; width: number; height: number },
  otherObjects: SceneObject[],
  enabled = true
): SnapResult {
  if (!enabled || otherObjects.length === 0) {
    return { x: draggedObj.x, y: draggedObj.y, guides: [] };
  }

  let snappedX = draggedObj.x;
  let snappedY = draggedObj.y;
  const guides: SmartGuideLine[] = [];

  const dragLeft = draggedObj.x;
  const dragRight = draggedObj.x + draggedObj.width;
  const dragCenterX = draggedObj.x + draggedObj.width / 2;

  const dragTop = draggedObj.y;
  const dragBottom = draggedObj.y + draggedObj.height;
  const dragCenterY = draggedObj.y + draggedObj.height / 2;

  let minDiffX = SNAP_THRESHOLD + 1;
  let minDiffY = SNAP_THRESHOLD + 1;

  for (const other of otherObjects) {
    if (!other.visible) continue;

    const otherLeft = other.x;
    const otherRight = other.x + other.width;
    const otherCenterX = other.x + other.width / 2;

    const otherTop = other.y;
    const otherBottom = other.y + other.height;
    const otherCenterY = other.y + other.height / 2;

    // --- Vertical Guides (X-Axis alignment) ---
    // Left to Left
    if (Math.abs(dragLeft - otherLeft) < minDiffX) {
      minDiffX = Math.abs(dragLeft - otherLeft);
      snappedX = otherLeft;
      guides.length = 0; // replace previous X guide
      guides.push({
        orientation: 'vertical',
        position: otherLeft,
        start: Math.min(dragTop, otherTop) - 20,
        end: Math.max(dragBottom, otherBottom) + 20,
        type: 'edge',
      });
    }
    // Left to Right
    if (Math.abs(dragLeft - otherRight) < minDiffX) {
      minDiffX = Math.abs(dragLeft - otherRight);
      snappedX = otherRight;
      guides.length = 0;
      guides.push({
        orientation: 'vertical',
        position: otherRight,
        start: Math.min(dragTop, otherTop) - 20,
        end: Math.max(dragBottom, otherBottom) + 20,
        type: 'edge',
      });
    }
    // Right to Left
    if (Math.abs(dragRight - otherLeft) < minDiffX) {
      minDiffX = Math.abs(dragRight - otherLeft);
      snappedX = otherLeft - draggedObj.width;
      guides.length = 0;
      guides.push({
        orientation: 'vertical',
        position: otherLeft,
        start: Math.min(dragTop, otherTop) - 20,
        end: Math.max(dragBottom, otherBottom) + 20,
        type: 'edge',
      });
    }
    // Right to Right
    if (Math.abs(dragRight - otherRight) < minDiffX) {
      minDiffX = Math.abs(dragRight - otherRight);
      snappedX = otherRight - draggedObj.width;
      guides.length = 0;
      guides.push({
        orientation: 'vertical',
        position: otherRight,
        start: Math.min(dragTop, otherTop) - 20,
        end: Math.max(dragBottom, otherBottom) + 20,
        type: 'edge',
      });
    }
    // Center to Center X
    if (Math.abs(dragCenterX - otherCenterX) < minDiffX) {
      minDiffX = Math.abs(dragCenterX - otherCenterX);
      snappedX = otherCenterX - draggedObj.width / 2;
      guides.length = 0;
      guides.push({
        orientation: 'vertical',
        position: otherCenterX,
        start: Math.min(dragTop, otherTop) - 20,
        end: Math.max(dragBottom, otherBottom) + 20,
        type: 'center',
      });
    }

    // --- Horizontal Guides (Y-Axis alignment) ---
    // Top to Top
    if (Math.abs(dragTop - otherTop) < minDiffY) {
      minDiffY = Math.abs(dragTop - otherTop);
      snappedY = otherTop;
      guides.push({
        orientation: 'horizontal',
        position: otherTop,
        start: Math.min(dragLeft, otherLeft) - 20,
        end: Math.max(dragRight, otherRight) + 20,
        type: 'edge',
      });
    }
    // Top to Bottom
    if (Math.abs(dragTop - otherBottom) < minDiffY) {
      minDiffY = Math.abs(dragTop - otherBottom);
      snappedY = otherBottom;
      guides.push({
        orientation: 'horizontal',
        position: otherBottom,
        start: Math.min(dragLeft, otherLeft) - 20,
        end: Math.max(dragRight, otherRight) + 20,
        type: 'edge',
      });
    }
    // Bottom to Top
    if (Math.abs(dragBottom - otherTop) < minDiffY) {
      minDiffY = Math.abs(dragBottom - otherTop);
      snappedY = otherTop - draggedObj.height;
      guides.push({
        orientation: 'horizontal',
        position: otherTop,
        start: Math.min(dragLeft, otherLeft) - 20,
        end: Math.max(dragRight, otherRight) + 20,
        type: 'edge',
      });
    }
    // Bottom to Bottom
    if (Math.abs(dragBottom - otherBottom) < minDiffY) {
      minDiffY = Math.abs(dragBottom - otherBottom);
      snappedY = otherBottom - draggedObj.height;
      guides.push({
        orientation: 'horizontal',
        position: otherBottom,
        start: Math.min(dragLeft, otherLeft) - 20,
        end: Math.max(dragRight, otherRight) + 20,
        type: 'edge',
      });
    }
    // Center to Center Y
    if (Math.abs(dragCenterY - otherCenterY) < minDiffY) {
      minDiffY = Math.abs(dragCenterY - otherCenterY);
      snappedY = otherCenterY - draggedObj.height / 2;
      guides.push({
        orientation: 'horizontal',
        position: otherCenterY,
        start: Math.min(dragLeft, otherLeft) - 20,
        end: Math.max(dragRight, otherRight) + 20,
        type: 'center',
      });
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
  };
}
