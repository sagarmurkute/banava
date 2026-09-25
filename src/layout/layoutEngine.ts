import type { FrameObject, Page, SceneObject } from '../types/document';
import { computeAutoLayout } from './autoLayout';

export function computeDocumentLayout(
  objects: SceneObject[]
): { objectUpdates: Record<string, Partial<SceneObject>> } {
  const objectUpdates: Record<string, Partial<SceneObject>> = {};

  // Build parent-child map
  const frameMap = new Map<string, FrameObject>();
  const childrenMap = new Map<string, SceneObject[]>();

  for (const obj of objects) {
    if (obj.type === 'frame') {
      frameMap.set(obj.id, obj as FrameObject);
    }
    if (obj.parentId) {
      const list = childrenMap.get(obj.parentId) || [];
      list.push(obj);
      childrenMap.set(obj.parentId, list);
    }
  }

  // Find depth of each frame to process innermost frames first
  const frameDepth = new Map<string, number>();

  function getDepth(frameId: string, visited = new Set<string>()): number {
    if (visited.has(frameId)) return 0;
    visited.add(frameId);

    const frame = frameMap.get(frameId);
    if (!frame || !frame.parentId || !frameMap.has(frame.parentId)) {
      return 0;
    }
    return 1 + getDepth(frame.parentId, visited);
  }

  for (const frameId of frameMap.keys()) {
    frameDepth.set(frameId, getDepth(frameId));
  }

  // Sort frames by descending depth (deepest child frames first)
  const sortedFrameIds = Array.from(frameMap.keys()).sort(
    (a, b) => (frameDepth.get(b) || 0) - (frameDepth.get(a) || 0)
  );

  // Compute Auto Layout for frames
  for (const frameId of sortedFrameIds) {
    const rawFrame = frameMap.get(frameId)!;
    // Merge any previous updates for this frame
    const currentFrame = {
      ...rawFrame,
      ...(objectUpdates[frameId] || {}),
    } as FrameObject;

    if (currentFrame.layoutMode && currentFrame.layoutMode !== 'none') {
      const rawChildren = childrenMap.get(frameId) || [];
      const currentChildren: SceneObject[] = rawChildren.map((c) => ({
        ...c,
        ...(objectUpdates[c.id] || {}),
      } as SceneObject));

      const { frameUpdates, childrenUpdates } = computeAutoLayout(
        currentFrame,
        currentChildren
      );

      if (frameUpdates) {
        objectUpdates[frameId] = {
          ...(objectUpdates[frameId] || {}),
          ...frameUpdates,
        };
      }

      for (const [childId, update] of Object.entries(childrenUpdates)) {
        objectUpdates[childId] = {
          ...(objectUpdates[childId] || {}),
          ...update,
        };
      }
    }
  }

  return { objectUpdates };
}

export function recomputePageLayout(page: Page): Page {
  const { objectUpdates } = computeDocumentLayout(page.objects);
  if (Object.keys(objectUpdates).length === 0) return page;

  const nextObjects = page.objects.map((obj) => {
    if (objectUpdates[obj.id]) {
      return { ...obj, ...objectUpdates[obj.id] } as SceneObject;
    }
    return obj;
  });

  return { ...page, objects: nextObjects };
}
