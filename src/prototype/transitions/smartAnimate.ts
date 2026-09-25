import type { SceneObject } from '../../types/document';

export interface SmartAnimatePair {
  id: string;
  sourceObj: SceneObject;
  destObj: SceneObject;
}

export function findMatchingLayers(
  sourceObjects: SceneObject[],
  destObjects: SceneObject[]
): {
  matchedPairs: SmartAnimatePair[];
  unmatchedSource: SceneObject[];
  unmatchedDest: SceneObject[];
} {
  const destMap = new Map<string, SceneObject>();
  destObjects.forEach((o) => destMap.set(o.id, o));

  // Secondary map by name for components/variants
  const destNameMap = new Map<string, SceneObject>();
  destObjects.forEach((o) => {
    if (o.name && !destNameMap.has(o.name)) {
      destNameMap.set(o.name, o);
    }
  });

  const matchedPairs: SmartAnimatePair[] = [];
  const matchedDestIds = new Set<string>();
  const unmatchedSource: SceneObject[] = [];

  for (const src of sourceObjects) {
    // 1. Direct ID match
    if (destMap.has(src.id)) {
      const dest = destMap.get(src.id)!;
      matchedPairs.push({ id: src.id, sourceObj: src, destObj: dest });
      matchedDestIds.add(dest.id);
    }
    // 2. Fallback name match if types match
    else if (destNameMap.has(src.name) && destNameMap.get(src.name)!.type === src.type) {
      const dest = destNameMap.get(src.name)!;
      if (!matchedDestIds.has(dest.id)) {
        matchedPairs.push({ id: src.id, sourceObj: src, destObj: dest });
        matchedDestIds.add(dest.id);
      } else {
        unmatchedSource.push(src);
      }
    } else {
      unmatchedSource.push(src);
    }
  }

  const unmatchedDest = destObjects.filter((o) => !matchedDestIds.has(o.id));

  return { matchedPairs, unmatchedSource, unmatchedDest };
}

export function interpolateValue(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function computeInterpolatedTransform(
  src: SceneObject,
  dest: SceneObject,
  progress: number
): {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
} {
  return {
    x: interpolateValue(src.x, dest.x, progress),
    y: interpolateValue(src.y, dest.y, progress),
    width: Math.max(1, interpolateValue(src.width, dest.width, progress)),
    height: Math.max(1, interpolateValue(src.height, dest.height, progress)),
    rotation: interpolateValue(src.rotation || 0, dest.rotation || 0, progress),
    opacity: interpolateValue(src.opacity ?? 100, dest.opacity ?? 100, progress),
  };
}
