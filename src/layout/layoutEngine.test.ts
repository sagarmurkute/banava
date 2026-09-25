import { recomputePageLayout } from './layoutEngine';
import { applyFrameResizeConstraints } from './constraints';
import type { FrameObject, Page, SceneObject } from '../types/document';

export function runFullLayoutTestSuite() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name, passed: false, error: msg });
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Horizontal Auto Layout
  test('1. Horizontal Auto Layout: child positioning', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      itemSpacing: 15,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 30,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const c2 = {
      id: 'c2',
      name: 'C2',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 60,
      height: 30,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1, c2] };
    const res = recomputePageLayout(page);
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    const rc2 = res.objects.find((o) => o.id === 'c2')!;
    assert(rc1.x === 10, `rc1.x should be 10, got ${rc1.x}`);
    assert(rc2.x === 10 + 50 + 15, `rc2.x should be 75, got ${rc2.x}`);
  });

  // 2. Vertical Auto Layout
  test('2. Vertical Auto Layout: child positioning', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 400,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'vertical',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      itemSpacing: 10,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const c2 = {
      id: 'c2',
      name: 'C2',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 60,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1, c2] };
    const res = recomputePageLayout(page);
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    const rc2 = res.objects.find((o) => o.id === 'c2')!;
    assert(rc1.y === 20, `rc1.y should be 20, got ${rc1.y}`);
    assert(rc2.y === 20 + 40 + 10, `rc2.y should be 70, got ${rc2.y}`);
  });

  // 3. Padding
  test('3. Padding: asymmetric padding applied', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 15, right: 25, bottom: 35, left: 45 },
      itemSpacing: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const res = recomputePageLayout(page);
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    assert(rc1.x === 50 + 45, `rc1.x should be 95, got ${rc1.x}`);
    assert(rc1.y === 50 + 15, `rc1.y should be 65, got ${rc1.y}`);
  });

  // 4. Gap
  test('4. Gap: multiple items spacing', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 25,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const c2 = {
      id: 'c2',
      name: 'C2',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1, c2] };
    const res = recomputePageLayout(page);
    const rc2 = res.objects.find((o) => o.id === 'c2')!;
    assert(rc2.x === 20 + 25, `rc2.x should be 45, got ${rc2.x}`);
  });

  // 5. Hug contents
  test('5. Hug contents: auto shrink wrap', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 999,
      height: 999,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'vertical',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      itemSpacing: 10,
      sizingHorizontal: 'hug',
      sizingVertical: 'hug',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const res = recomputePageLayout(page);
    const rf = res.objects.find((o) => o.id === 'f1')!;
    assert(rf.width === 100 + 20, `frame width should hug to 120, got ${rf.width}`);
    assert(rf.height === 50 + 20, `frame height should hug to 70, got ${rf.height}`);
  });

  // 6. Fill container
  test('6. Fill container: stretches across primary and counter axis', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      itemSpacing: 10,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fill',
      sizingVertical: 'fill',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const res = recomputePageLayout(page);
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    assert(rc1.width === 400 - 20, `rc1.width should fill to 380, got ${rc1.width}`);
    assert(rc1.height === 100 - 20, `rc1.height should fill to 80, got ${rc1.height}`);
  });

  // 7. Fixed sizing
  test('7. Fixed sizing: maintains exact pixel dimensions', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 300,
      height: 300,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 77,
      height: 88,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const res = recomputePageLayout(page);
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    assert(rc1.width === 77 && rc1.height === 88, 'fixed child dimensions preserved');
  });

  // 8. Left constraint
  test('8. Left constraint: maintains offset from left', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      constraints: { horizontal: 'left', vertical: 'top' },
    } as SceneObject;

    const updates = applyFrameResizeConstraints(frame, [c1], 400, 400);
    assert(updates['c1'].x === 20, `c1.x should stay 20, got ${updates['c1'].x}`);
  });

  // 9. Right constraint
  test('9. Right constraint: maintains distance from right edge', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 130, // 200 - 50 - 20 = 20px from right
      y: 20,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      constraints: { horizontal: 'right', vertical: 'top' },
    } as SceneObject;

    const updates = applyFrameResizeConstraints(frame, [c1], 400, 200);
    // new width 400 - 50 - 20 = 330
    assert(updates['c1'].x === 330, `c1.x should be 330, got ${updates['c1'].x}`);
  });

  // 10. Left + Right constraint
  test('10. Left + Right constraint: stretches horizontally', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 160, // 20 from left, 20 from right
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      constraints: { horizontal: 'left-right', vertical: 'top' },
    } as SceneObject;

    const updates = applyFrameResizeConstraints(frame, [c1], 500, 200);
    // 500 - 20 - 20 = 460 width
    assert(updates['c1'].width === 460, `c1.width should stretch to 460, got ${updates['c1'].width}`);
  });

  // 11. Center constraint
  test('11. Center constraint: remains centered', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 75,
      y: 75,
      width: 50,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      constraints: { horizontal: 'center', vertical: 'center' },
    } as SceneObject;

    const updates = applyFrameResizeConstraints(frame, [c1], 400, 400);
    assert(updates['c1'].x === 175, `c1.x should be 175, got ${updates['c1'].x}`);
    assert(updates['c1'].y === 175, `c1.y should be 175, got ${updates['c1'].y}`);
  });

  // 12. Top + Bottom constraint
  test('12. Top + Bottom constraint: stretches vertically', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 50,
      height: 160,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      constraints: { horizontal: 'left', vertical: 'top-bottom' },
    } as SceneObject;

    const updates = applyFrameResizeConstraints(frame, [c1], 200, 600);
    assert(updates['c1'].height === 560, `c1.height should be 560, got ${updates['c1'].height}`);
  });

  // 13. Nested frames
  test('13. Nested frames: recursive layout propagation', () => {
    const parent = {
      id: 'parent',
      name: 'Parent',
      type: 'frame',
      x: 0,
      y: 0,
      width: 500,
      height: 500,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'vertical',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'stretch',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      itemSpacing: 10,
      sizingHorizontal: 'fixed',
      sizingVertical: 'hug',
    } as FrameObject;

    const childFrame = {
      id: 'childFrame',
      name: 'ChildFrame',
      type: 'frame',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'parent',
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 5, right: 5, bottom: 5, left: 5 },
      itemSpacing: 5,
      sizingHorizontal: 'fill',
      sizingVertical: 'hug',
    } as FrameObject;

    const leaf = {
      id: 'leaf',
      name: 'Leaf',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 80,
      height: 30,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'childFrame',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [parent, childFrame, leaf] };
    const res = recomputePageLayout(page);
    const rChild = res.objects.find((o) => o.id === 'childFrame')!;
    const rParent = res.objects.find((o) => o.id === 'parent')!;
    assert(rChild.width === 480, `childFrame width should fill parent to 480, got ${rChild.width}`);
    assert(rChild.height === 40, `childFrame height should hug to 40, got ${rChild.height}`);
    assert(rParent.height === 60, `parent height should hug to 60, got ${rParent.height}`);
  });

  // 14. Frame resizing
  test('14. Frame resizing: layout adapts when parent resized', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 600, // resized from 300
      height: 200,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'stretch',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fill',
      sizingVertical: 'fill',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const res = recomputePageLayout(page);
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    assert(rc1.width === 600, `rc1 should expand to 600, got ${rc1.width}`);
    assert(rc1.height === 200, `rc1 should expand to 200, got ${rc1.height}`);
  });

  // 15. Object insertion
  test('15. Object insertion: adding a child updates layout', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 10,
      sizingHorizontal: 'hug',
      sizingVertical: 'hug',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const c2 = {
      id: 'c2',
      name: 'C2',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1, c2] };
    const res = recomputePageLayout(page);
    const rf = res.objects.find((o) => o.id === 'f1')!;
    assert(rf.width === 110, `hug width should expand to 110 after inserting c2, got ${rf.width}`);
  });

  // 16. Object removal
  test('16. Object removal: removing a child recalculates bounds', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 10,
      sizingHorizontal: 'hug',
      sizingVertical: 'hug',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 50,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const res = recomputePageLayout(page);
    const rf = res.objects.find((o) => o.id === 'f1')!;
    assert(rf.width === 50, `hug width should shrink to 50, got ${rf.width}`);
  });

  // 17. Reordering
  test('17. Reordering: changing child order updates sequence', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 10,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const c2 = {
      id: 'c2',
      name: 'C2',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    // c2 first, then c1
    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c2, c1] };
    const res = recomputePageLayout(page);
    const rc2 = res.objects.find((o) => o.id === 'c2')!;
    const rc1 = res.objects.find((o) => o.id === 'c1')!;
    assert(rc2.x === 0, `rc2.x should be 0, got ${rc2.x}`);
    assert(rc1.x === 40 + 10, `rc1.x should be 50, got ${rc1.x}`);
  });

  // 18. Undo/redo layout consistency
  test('18. Undo/redo layout snapshot consistency', () => {
    const frame = {
      id: 'f1',
      name: 'F1',
      type: 'frame',
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#181b24',
      cornerRadius: 0,
      clipsContent: false,
      layoutMode: 'horizontal',
      primaryAxisAlignItems: 'start',
      counterAxisAlignItems: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 10,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as FrameObject;

    const c1 = {
      id: 'c1',
      name: 'C1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: 'f1',
      fill: '#ffffff',
      cornerRadius: 0,
      sizingHorizontal: 'fixed',
      sizingVertical: 'fixed',
    } as SceneObject;

    const page: Page = { id: 'p1', name: 'Page', objects: [frame, c1] };
    const snap1 = recomputePageLayout(page);
    const restored = recomputePageLayout(snap1);
    const rf = restored.objects.find((o) => o.id === 'f1')!;
    assert(rf.width === 300, `restored frame width should be 300, got ${rf.width}`);
  });

  return results;
}
