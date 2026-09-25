import type { FrameObject, SceneObject } from '../types/document';

export function applyFrameResizeConstraints(
  frame: FrameObject,
  children: SceneObject[],
  newWidth: number,
  newHeight: number,
  prevWidth: number = frame.width,
  prevHeight: number = frame.height
): Record<string, Partial<SceneObject>> {
  const updates: Record<string, Partial<SceneObject>> = {};
  if (!children || children.length === 0 || prevWidth <= 0 || prevHeight <= 0) {
    return updates;
  }

  const deltaW = newWidth - prevWidth;
  const deltaH = newHeight - prevHeight;

  if (deltaW === 0 && deltaH === 0) return updates;

  for (const child of children) {
    // Relative position inside the frame before resize
    const relX = child.x - frame.x;
    const relY = child.y - frame.y;

    const constraints = child.constraints || {
      horizontal: 'left',
      vertical: 'top',
    };

    let nextRelX = relX;
    let nextRelY = relY;
    let nextW = child.width;
    let nextH = child.height;

    // --- Horizontal Constraints ---
    switch (constraints.horizontal) {
      case 'left':
        // Anchored to left edge, stays at relX
        break;
      case 'right': {
        const rightMargin = prevWidth - (relX + child.width);
        nextRelX = newWidth - child.width - rightMargin;
        break;
      }
      case 'left-right': {
        const rightMargin = prevWidth - (relX + child.width);
        nextW = Math.max(5, newWidth - relX - rightMargin);
        break;
      }
      case 'center': {
        const centerOffset = relX + child.width / 2 - prevWidth / 2;
        nextRelX = newWidth / 2 + centerOffset - child.width / 2;
        break;
      }
      case 'scale': {
        const scaleX = newWidth / prevWidth;
        nextRelX = relX * scaleX;
        nextW = Math.max(5, child.width * scaleX);
        break;
      }
    }

    // --- Vertical Constraints ---
    switch (constraints.vertical) {
      case 'top':
        // Anchored to top edge, stays at relY
        break;
      case 'bottom': {
        const bottomMargin = prevHeight - (relY + child.height);
        nextRelY = newHeight - child.height - bottomMargin;
        break;
      }
      case 'top-bottom': {
        const bottomMargin = prevHeight - (relY + child.height);
        nextH = Math.max(5, newHeight - relY - bottomMargin);
        break;
      }
      case 'center': {
        const centerOffset = relY + child.height / 2 - prevHeight / 2;
        nextRelY = newHeight / 2 + centerOffset - child.height / 2;
        break;
      }
      case 'scale': {
        const scaleY = newHeight / prevHeight;
        nextRelY = relY * scaleY;
        nextH = Math.max(5, child.height * scaleY);
        break;
      }
    }

    updates[child.id] = {
      x: Math.round(frame.x + nextRelX),
      y: Math.round(frame.y + nextRelY),
      width: Math.round(nextW),
      height: Math.round(nextH),
    };
  }

  return updates;
}
