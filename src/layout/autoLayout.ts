import type { FrameObject, SceneObject } from '../types/document';
import type { FrameLayoutResult } from './types';

export function computeAutoLayout(
  frame: FrameObject,
  children: SceneObject[]
): FrameLayoutResult {
  const childrenUpdates: Record<string, Partial<SceneObject>> = {};
  if (children.length === 0 || frame.layoutMode === 'none') {
    return { childrenUpdates };
  }

  const {
    layoutMode,
    itemSpacing = 0,
    padding = { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAxisAlignItems = 'start',
    counterAxisAlignItems = 'start',
    sizingHorizontal = 'fixed',
    sizingVertical = 'fixed',
  } = frame;

  const isHorizontal = layoutMode === 'horizontal';

  // Sort visible children
  const visibleChildren = children.filter((c) => c.visible);
  if (visibleChildren.length === 0) {
    return { childrenUpdates };
  }

  // 1. First pass: compute non-fill child sizes and available space
  let totalFixedPrimary = 0;
  let maxChildCounter = 0;
  let fillPrimaryCount = 0;

  for (const child of visibleChildren) {
    const childPrimarySizing = isHorizontal ? child.sizingHorizontal : child.sizingVertical;
    const childPrimaryDim = isHorizontal ? child.width : child.height;
    const childCounterDim = isHorizontal ? child.height : child.width;

    if (childPrimarySizing === 'fill') {
      fillPrimaryCount++;
    } else {
      totalFixedPrimary += childPrimaryDim;
    }

    if (childCounterDim > maxChildCounter) {
      maxChildCounter = childCounterDim;
    }
  }

  const paddingPrimaryStart = isHorizontal ? padding.left : padding.top;
  const paddingPrimaryEnd = isHorizontal ? padding.right : padding.bottom;
  const paddingCounterStart = isHorizontal ? padding.top : padding.left;
  const paddingCounterEnd = isHorizontal ? padding.bottom : padding.right;

  const totalPaddingPrimary = paddingPrimaryStart + paddingPrimaryEnd;
  const totalPaddingCounter = paddingCounterStart + paddingCounterEnd;

  const totalGaps = Math.max(0, visibleChildren.length - 1) * itemSpacing;

  // Frame dimension calculation
  let frameWidth = frame.width;
  let frameHeight = frame.height;
  let frameUpdates: Partial<FrameObject> | undefined;

  // Hug dimensions
  if (sizingHorizontal === 'hug' && isHorizontal) {
    frameWidth = totalFixedPrimary + totalGaps + totalPaddingPrimary;
  } else if (sizingHorizontal === 'hug' && !isHorizontal) {
    frameWidth = maxChildCounter + totalPaddingCounter;
  }

  if (sizingVertical === 'hug' && !isHorizontal) {
    frameHeight = totalFixedPrimary + totalGaps + totalPaddingPrimary;
  } else if (sizingVertical === 'hug' && isHorizontal) {
    frameHeight = maxChildCounter + totalPaddingCounter;
  }

  // Min/max dimensions clamping on frame
  if (frame.minWidth !== undefined) frameWidth = Math.max(frameWidth, frame.minWidth);
  if (frame.maxWidth !== undefined) frameWidth = Math.min(frameWidth, frame.maxWidth);
  if (frame.minHeight !== undefined) frameHeight = Math.max(frameHeight, frame.minHeight);
  if (frame.maxHeight !== undefined) frameHeight = Math.min(frameHeight, frame.maxHeight);

  if (frameWidth !== frame.width || frameHeight !== frame.height) {
    frameUpdates = { width: frameWidth, height: frameHeight };
  }

  const availablePrimarySpace = (isHorizontal ? frameWidth : frameHeight) - totalPaddingPrimary - totalGaps;
  const availableCounterSpace = (isHorizontal ? frameHeight : frameWidth) - totalPaddingCounter;

  const fillItemPrimarySize =
    fillPrimaryCount > 0
      ? Math.max(0, (availablePrimarySpace - totalFixedPrimary) / fillPrimaryCount)
      : 0;

  // Calculate primary axis start offset based on alignment
  let primaryCursor = paddingPrimaryStart;
  let effectiveSpacing = itemSpacing;

  const totalContentPrimary =
    fillPrimaryCount > 0
      ? availablePrimarySpace + totalGaps
      : totalFixedPrimary + totalGaps;

  const extraPrimarySpace = (isHorizontal ? frameWidth : frameHeight) - totalPaddingPrimary - totalContentPrimary;

  if (primaryAxisAlignItems === 'center') {
    primaryCursor += Math.max(0, extraPrimarySpace / 2);
  } else if (primaryAxisAlignItems === 'end') {
    primaryCursor += Math.max(0, extraPrimarySpace);
  } else if (primaryAxisAlignItems === 'space-between' && visibleChildren.length > 1) {
    effectiveSpacing = itemSpacing + Math.max(0, extraPrimarySpace / (visibleChildren.length - 1));
  }

  // 2. Second pass: position and size each child relative to parent frame top-left (frame.x, frame.y)
  for (const child of visibleChildren) {
    const childPrimarySizing = isHorizontal ? child.sizingHorizontal : child.sizingVertical;
    const childCounterSizing = isHorizontal ? child.sizingVertical : child.sizingHorizontal;

    let childWidth = child.width;
    let childHeight = child.height;

    // Apply primary sizing
    if (childPrimarySizing === 'fill') {
      if (isHorizontal) childWidth = fillItemPrimarySize;
      else childHeight = fillItemPrimarySize;
    }

    // Apply counter sizing
    if (childCounterSizing === 'fill') {
      if (isHorizontal) childHeight = availableCounterSpace;
      else childWidth = availableCounterSpace;
    }

    // Min / max clamps on child
    if (child.minWidth !== undefined) childWidth = Math.max(childWidth, child.minWidth);
    if (child.maxWidth !== undefined) childWidth = Math.min(childWidth, child.maxWidth);
    if (child.minHeight !== undefined) childHeight = Math.max(childHeight, child.minHeight);
    if (child.maxHeight !== undefined) childHeight = Math.min(childHeight, child.maxHeight);

    // Calculate counter position
    let counterPos = paddingCounterStart;
    const childCounterSize = isHorizontal ? childHeight : childWidth;
    const alignSelf = child.alignSelf || counterAxisAlignItems;

    if (alignSelf === 'center') {
      counterPos += Math.max(0, (availableCounterSpace - childCounterSize) / 2);
    } else if (alignSelf === 'end') {
      counterPos += Math.max(0, availableCounterSpace - childCounterSize);
    } else if (alignSelf === 'stretch' && childCounterSizing !== 'fill') {
      if (isHorizontal) childHeight = availableCounterSpace;
      else childWidth = availableCounterSpace;
    }

    const relX = isHorizontal ? primaryCursor : counterPos;
    const relY = isHorizontal ? counterPos : primaryCursor;

    const absX = frame.x + relX;
    const absY = frame.y + relY;

    childrenUpdates[child.id] = {
      x: Math.round(absX),
      y: Math.round(absY),
      width: Math.round(childWidth),
      height: Math.round(childHeight),
    };

    const actualPrimaryDim = isHorizontal ? childWidth : childHeight;
    primaryCursor += actualPrimaryDim + effectiveSpacing;
  }

  return { frameUpdates, childrenUpdates };
}
