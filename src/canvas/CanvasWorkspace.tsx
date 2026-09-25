import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useViewportStore } from '../state/useViewportStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useToolStore } from '../state/useToolStore';
import { useUIStore } from '../state/useUIStore';
import { CanvasObjectRenderer } from './CanvasObjectRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { CanvasRulers } from './CanvasRulers';
import { ContextMenu } from './ContextMenu';
import { AutoLayoutVisualizer } from './AutoLayoutVisualizer';
import { PrototypeConnectionOverlay } from './PrototypeConnectionOverlay';
import { calculateBoundingBox, screenToCanvas, snap } from '../utils/geometry';
import { calculateSmartGuidesAndSnap } from '../utils/smartGuides';
import { processImageFile } from '../utils/imageImporter';
import { generateId } from '../utils/id';
import { LiveCursorsOverlay } from '../collaboration/cursors/LiveCursorsOverlay';
import { LiveSelectionBoxes } from '../collaboration/cursors/LiveSelectionBoxes';
import { CanvasCommentsLayer } from '../collaboration/comments/CanvasCommentsLayer';
import { usePresenceStore } from '../collaboration/presence/usePresenceStore';
import { useCommentsStore } from '../collaboration/comments/useCommentsStore';
import { usePermissionsStore } from '../collaboration/permissions/usePermissionsStore';
import type { SceneObject, ResizeHandleType, BoundingBox, SmartGuideLine, FrameObject } from '../types/document';
import './canvas.css';

interface DragState {
  type: 'pan' | 'create' | 'move' | 'resize' | 'marquee';
  startX: number;
  startY: number;
  canvasStartX: number;
  canvasStartY: number;
  isAltDuplicated?: boolean;
  handle?: ResizeHandleType;
  initialObjects?: Record<string, { x: number; y: number; width: number; height: number }>;
  initialBbox?: BoundingBox;
}

interface MarqueeBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const CanvasWorkspace: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store hooks
  const { x: vpX, y: vpY, zoom, pan, zoomTo } = useViewportStore();
  const { getActivePage, addObject, updateObjects, commitHistory, duplicateObjects } = useDocumentStore();
  const { selectedIds, select, selectMultiple, deselectAll, hoveredId } = useSelectionStore();
  const { activeTool, setActiveTool, isSpacePressed } = useToolStore();
  const { showGrid, showRulers, snapToGrid, gridSize } = useUIStore();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  // Local state for dragging & previews
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [ghostBox, setGhostBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const [activeGuides, setActiveGuides] = useState<SmartGuideLine[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);

  // Selected objects
  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
  const selectionBbox = calculateBoundingBox(selectedObjects);

  // Double click to edit text inline
  const handleDoubleClick = (_e: React.MouseEvent, objId: string) => {
    const obj = objects.find((o) => o.id === objId);
    if (obj && obj.type === 'text') {
      setEditingTextId(objId);
    }
  };

  // Convert client coordinates to canvas world coordinates
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    let { x, y } = screenToCanvas(clientX, clientY, { x: vpX, y: vpY, zoom }, rect);
    if (snapToGrid) {
      x = snap(x, gridSize);
      y = snap(y, gridSize);
    }
    return { x, y };
  }, [vpX, vpY, zoom, snapToGrid, gridSize]);

  // Handle Wheel: Zoom & Pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomTo(zoom * zoomFactor, e.clientX, e.clientY, rect);
    } else {
      pan(-e.deltaX, -e.deltaY);
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (editingTextId) {
      setEditingTextId(null);
    }

    if (!containerRef.current) return;
    const isMiddleClick = e.button === 1;
    const isPanning = isMiddleClick || isSpacePressed;

    if (isPanning) {
      setDragState({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        canvasStartX: vpX,
        canvasStartY: vpY,
      });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // If comment tool is active, place a comment pin
    if (useCommentsStore.getState().isCommentModeActive) {
      useCommentsStore.getState().setNewCommentCoords({ x, y });
      return;
    }

    // If user has viewer role, disallow creating new objects
    if (usePermissionsStore.getState().currentUserRole === 'viewer') {
      if (activeTool !== 'select') return;
    }

    // If active tool is a creation tool
    if (activeTool !== 'select') {
      if (activeTool === 'text') {
        const newText: SceneObject = {
          id: generateId('text'),
          name: 'Text',
          type: 'text',
          x,
          y,
          width: 160,
          height: 30,
          rotation: 0,
          opacity: 100,
          visible: true,
          locked: false,
          parentId: null,
          content: 'Type something...',
          fontSize: 16,
          fontWeight: 400,
          fontFamily: 'Inter, sans-serif',
          fill: '#ffffff',
          textAlign: 'left',
          lineHeight: 1.2,
          letterSpacing: 0,
          autoResize: 'auto-width',
        };
        addObject(newText);
        select(newText.id);
        setActiveTool('select');
        setEditingTextId(newText.id);
        return;
      }

      setDragState({
        type: 'create',
        startX: e.clientX,
        startY: e.clientY,
        canvasStartX: x,
        canvasStartY: y,
      });
      setGhostBox({ x, y, width: 0, height: 0 });
      return;
    }

    // Tool is 'select' and clicked empty canvas
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-world')) {
      if (!e.shiftKey) {
        deselectAll();
      }
      setDragState({
        type: 'marquee',
        startX: e.clientX,
        startY: e.clientY,
        canvasStartX: x,
        canvasStartY: y,
      });
      setMarqueeBox({ minX: x, minY: y, maxX: x, maxY: y });
    }
  };

  // Object Selection Handler
  const handleObjectSelect = (e: React.MouseEvent, objId: string) => {
    e.stopPropagation();
    if (isSpacePressed || e.button === 1) return;
    if (activeTool !== 'select') return;

    let currentSelected = selectedIds;

    // Alt + Drag duplication
    if (e.altKey && selectedIds.includes(objId)) {
      const dupIds = duplicateObjects(selectedIds, { x: 0, y: 0 });
      selectMultiple(dupIds);
      currentSelected = dupIds;
    } else if (e.shiftKey) {
      select(objId, true);
      currentSelected = selectedIds.includes(objId) ? selectedIds.filter(i => i !== objId) : [...selectedIds, objId];
    } else if (!selectedIds.includes(objId)) {
      select(objId, false);
      currentSelected = [objId];
    }

    const initialMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const id of currentSelected) {
      const obj = objects.find((o) => o.id === id);
      if (obj) {
        initialMap[id] = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
      }
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    setDragState({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      canvasStartX: x,
      canvasStartY: y,
      initialObjects: initialMap,
      isAltDuplicated: e.altKey,
    });
  };

  // Selection Overlay Move Start
  const handleSelectionMoveStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpacePressed) return;

    let targetIds = selectedIds;
    if (e.altKey) {
      const dupIds = duplicateObjects(selectedIds, { x: 0, y: 0 });
      selectMultiple(dupIds);
      targetIds = dupIds;
    }

    const initialMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const id of targetIds) {
      const obj = objects.find((o) => o.id === id);
      if (obj) {
        initialMap[id] = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
      }
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    setDragState({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      canvasStartX: x,
      canvasStartY: y,
      initialObjects: initialMap,
      isAltDuplicated: e.altKey,
    });
  };

  // Resize Handle Start
  const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandleType) => {
    e.stopPropagation();
    if (isSpacePressed || !selectionBbox) return;

    const initialMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const id of selectedIds) {
      const obj = objects.find((o) => o.id === id);
      if (obj) {
        initialMap[id] = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
      }
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    setDragState({
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      canvasStartX: x,
      canvasStartY: y,
      initialObjects: initialMap,
      initialBbox: selectionBbox,
    });
  };

  // Window Mouse Move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      if (dragState.type === 'pan') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        pan(dx, dy);
        setDragState((prev) => (prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null));
        return;
      }

      const { x: currX, y: currY } = getCanvasCoords(e.clientX, e.clientY);

      if (dragState.type === 'create') {
        const minX = Math.min(dragState.canvasStartX, currX);
        const minY = Math.min(dragState.canvasStartY, currY);
        let width = Math.abs(currX - dragState.canvasStartX);
        let height = activeTool === 'line' ? 0 : Math.abs(currY - dragState.canvasStartY);

        // Constrain aspect ratio if Shift is held during creation
        if (e.shiftKey && activeTool !== 'line') {
          const maxDim = Math.max(width, height);
          width = maxDim;
          height = maxDim;
        }

        setGhostBox({ x: minX, y: minY, width, height });
      } else if (dragState.type === 'marquee') {
        const minX = Math.min(dragState.canvasStartX, currX);
        const minY = Math.min(dragState.canvasStartY, currY);
        const maxX = Math.max(dragState.canvasStartX, currX);
        const maxY = Math.max(dragState.canvasStartY, currY);

        setMarqueeBox({ minX, minY, maxX, maxY });

        const intersectingIds = objects
          .filter((obj) => {
            if (!obj.visible || obj.locked) return false;
            return (
              obj.x < maxX &&
              obj.x + obj.width > minX &&
              obj.y < maxY &&
              obj.y + obj.height > minY
            );
          })
          .map((o) => o.id);

        selectMultiple(intersectingIds);
      } else if (dragState.type === 'move' && dragState.initialObjects) {
        let rawDx = currX - dragState.canvasStartX;
        let rawDy = currY - dragState.canvasStartY;

        // Shift + Drag: Constrain movement to horizontal or vertical axis
        if (e.shiftKey) {
          if (Math.abs(rawDx) > Math.abs(rawDy)) {
            rawDy = 0;
          } else {
            rawDx = 0;
          }
        }

        // Smart guides alignment on primary dragged object
        const firstId = Object.keys(dragState.initialObjects)[0];
        const firstInit = dragState.initialObjects[firstId];

        let targetDx = rawDx;
        let targetDy = rawDy;

        if (firstInit && !snapToGrid) {
          const testRect = {
            x: firstInit.x + rawDx,
            y: firstInit.y + rawDy,
            width: firstInit.width,
            height: firstInit.height,
          };
          const unselectedObjects = objects.filter((o) => !selectedIds.includes(o.id));
          const snapRes = calculateSmartGuidesAndSnap(testRect, unselectedObjects, true);

          targetDx = snapRes.x - firstInit.x;
          targetDy = snapRes.y - firstInit.y;
          setActiveGuides(snapRes.guides);
        } else {
          setActiveGuides([]);
        }

        // Check for drop target frame
        const targetFrame = objects.find(
          (o) =>
            o.type === 'frame' &&
            !selectedIds.includes(o.id) &&
            currX >= o.x &&
            currX <= o.x + o.width &&
            currY >= o.y &&
            currY <= o.y + o.height
        );
        setHoveredFrameId(targetFrame ? targetFrame.id : null);

        const updates: Record<string, Partial<SceneObject>> = {};
        for (const [id, init] of Object.entries(dragState.initialObjects)) {
          let newX = init.x + targetDx;
          let newY = init.y + targetDy;
          if (snapToGrid) {
            newX = snap(newX, gridSize);
            newY = snap(newY, gridSize);
          }
          updates[id] = { x: newX, y: newY };
        }
        updateObjects(updates, false);
      } else if (dragState.type === 'resize' && dragState.initialObjects && dragState.initialBbox && dragState.handle) {
        const handle = dragState.handle;
        const initialBbox = dragState.initialBbox;
        const dx = currX - dragState.canvasStartX;
        const dy = currY - dragState.canvasStartY;

        let newMinX = initialBbox.minX;
        let newMinY = initialBbox.minY;
        let newMaxX = initialBbox.maxX;
        let newMaxY = initialBbox.maxY;

        if (handle.includes('e')) newMaxX = Math.max(initialBbox.minX + 10, initialBbox.maxX + dx);
        if (handle.includes('w')) newMinX = Math.min(initialBbox.maxX - 10, initialBbox.minX + dx);
        if (handle.includes('s')) newMaxY = Math.max(initialBbox.minY + 10, initialBbox.maxY + dy);
        if (handle.includes('n')) newMinY = Math.min(initialBbox.maxY - 10, initialBbox.minY + dy);

        let newW = newMaxX - newMinX;
        let newH = newMaxY - newMinY;

        // Shift + Resize: Maintain Aspect Ratio
        if (e.shiftKey && initialBbox.width > 0 && initialBbox.height > 0) {
          const ratio = initialBbox.width / initialBbox.height;
          if (newW / newH > ratio) {
            newW = newH * ratio;
          } else {
            newH = newW / ratio;
          }
          if (handle.includes('w')) newMinX = newMaxX - newW;
          else newMaxX = newMinX + newW;
          if (handle.includes('n')) newMinY = newMaxY - newH;
          else newMaxY = newMinY + newH;
        }

        const singleFrame = selectedObjects.length === 1 && selectedObjects[0].type === 'frame'
          ? (selectedObjects[0] as FrameObject)
          : null;

        if (singleFrame) {
          useDocumentStore.getState().resizeFrameWithConstraints(singleFrame.id, Math.round(newW), Math.round(newH));
        } else {
          const scaleX = initialBbox.width > 0 ? newW / initialBbox.width : 1;
          const scaleY = initialBbox.height > 0 ? newH / initialBbox.height : 1;

          const updates: Record<string, Partial<SceneObject>> = {};
          for (const [id, init] of Object.entries(dragState.initialObjects)) {
            const relX = init.x - initialBbox.minX;
            const relY = init.y - initialBbox.minY;

            let targetX = newMinX + relX * scaleX;
            let targetY = newMinY + relY * scaleY;
            let targetW = Math.max(5, init.width * scaleX);
            let targetH = Math.max(5, init.height * scaleY);

            if (snapToGrid) {
              targetX = snap(targetX, gridSize);
              targetY = snap(targetY, gridSize);
              targetW = snap(targetW, gridSize);
              targetH = snap(targetH, gridSize);
            }

            updates[id] = {
              x: targetX,
              y: targetY,
              width: targetW,
              height: targetH,
            };
          }
          updateObjects(updates, false);
        }
      }
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      setActiveGuides([]);

      if (dragState.type === 'move') {
        if (hoveredFrameId) {
          for (const id of selectedIds) {
            useDocumentStore.getState().reparentObject(id, hoveredFrameId);
          }
        }
        setHoveredFrameId(null);
      }

      if (dragState.type === 'create' && ghostBox) {
        const finalW = Math.max(ghostBox.width, 30);
        const finalH = activeTool === 'line' ? 0 : Math.max(ghostBox.height, 30);

        let newObj: SceneObject | null = null;
        const id = generateId(activeTool);

        switch (activeTool) {
          case 'frame':
            newObj = {
              id,
              name: `Frame ${objects.filter((o) => o.type === 'frame').length + 1}`,
              type: 'frame',
              x: ghostBox.x,
              y: ghostBox.y,
              width: finalW,
              height: finalH,
              rotation: 0,
              opacity: 100,
              visible: true,
              locked: false,
              parentId: null,
              fill: '#1e2430',
              stroke: '#3b4354',
              strokeWidth: 1,
              cornerRadius: 8,
              clipsContent: false,
            };
            break;
          case 'rectangle':
            newObj = {
              id,
              name: `Rectangle ${objects.filter((o) => o.type === 'rectangle').length + 1}`,
              type: 'rectangle',
              x: ghostBox.x,
              y: ghostBox.y,
              width: finalW,
              height: finalH,
              rotation: 0,
              opacity: 100,
              visible: true,
              locked: false,
              parentId: null,
              fill: '#6366f1',
              stroke: '#818cf8',
              strokeWidth: 0,
              cornerRadius: 0,
            };
            break;
          case 'ellipse':
            newObj = {
              id,
              name: `Ellipse ${objects.filter((o) => o.type === 'ellipse').length + 1}`,
              type: 'ellipse',
              x: ghostBox.x,
              y: ghostBox.y,
              width: finalW,
              height: finalH,
              rotation: 0,
              opacity: 100,
              visible: true,
              locked: false,
              parentId: null,
              fill: '#ec4899',
              stroke: '#f472b6',
              strokeWidth: 0,
            };
            break;
          case 'polygon':
            newObj = {
              id,
              name: `Polygon ${objects.filter((o) => o.type === 'polygon').length + 1}`,
              type: 'polygon',
              x: ghostBox.x,
              y: ghostBox.y,
              width: finalW,
              height: finalH,
              rotation: 0,
              opacity: 100,
              visible: true,
              locked: false,
              parentId: null,
              points: 3,
              isStar: false,
              fill: '#eab308',
              stroke: '#fde047',
              strokeWidth: 0,
            };
            break;
          case 'line':
            newObj = {
              id,
              name: `Line ${objects.filter((o) => o.type === 'line').length + 1}`,
              type: 'line',
              x: ghostBox.x,
              y: ghostBox.y,
              width: Math.max(finalW, 50),
              height: 0,
              rotation: 0,
              opacity: 100,
              visible: true,
              locked: false,
              parentId: null,
              stroke: '#94a3b8',
              strokeWidth: 2,
            };
            break;
        }

        if (newObj) {
          addObject(newObj);
          select(newObj.id);
          setActiveTool('select');
        }
      } else if (dragState.type === 'move' || dragState.type === 'resize') {
        commitHistory();
      }

      setDragState(null);
      setGhostBox(null);
      setMarqueeBox(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState,
    ghostBox,
    activeTool,
    objects,
    selectedIds,
    pan,
    getCanvasCoords,
    updateObjects,
    addObject,
    select,
    selectMultiple,
    setActiveTool,
    commitHistory,
    snapToGrid,
    gridSize,
  ]);

  // Determine cursor based on tool and space
  const getCursor = () => {
    if (isSpacePressed || dragState?.type === 'pan') return 'grab';
    if (activeTool === 'text') return 'text';
    if (activeTool !== 'select') return 'crosshair';
    return 'default';
  };

  const currentEditingObj = objects.find((o) => o.id === editingTextId && o.type === 'text');

  // Track container dimensions for rulers
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const componentId =
      e.dataTransfer.getData('text/component-id') ||
      e.dataTransfer.getData('application/banava-component-id');
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (componentId) {
      const instId = useDocumentStore.getState().createInstance(componentId, x, y);
      if (instId) {
        select(instId);
        useUIStore.getState().setStatusMessage('Created component instance');
      }
      return;
    }

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('image/')) return;

    try {
      const { asset, imageObject } = await processImageFile(file, x, y);
      useDocumentStore.getState().addAsset(asset);
      addObject(imageObject);
      select(imageObject.id);
      useUIStore.getState().setStatusMessage(`Imported image: ${file.name}`);
    } catch (err) {
      console.error('Image import failed:', err);
      useUIStore.getState().setStatusMessage('Failed to import image');
    }
  };

  // Sync local selection with presence
  useEffect(() => {
    usePresenceStore.getState().updateLocalSelection(selectedIds);
  }, [selectedIds]);

  const handleWorkspaceMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    usePresenceStore.getState().updateLocalCursor(x, y);
  };

  const handleWorkspaceMouseLeave = () => {
    usePresenceStore.getState().updateLocalCursor(null, null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: x,
      canvasY: y,
    });
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor: getCursor() }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleWorkspaceMouseMove}
      onMouseLeave={handleWorkspaceMouseLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canvasX={contextMenu.canvasX}
          canvasY={contextMenu.canvasY}
          onClose={() => setContextMenu(null)}
        />
      )}
      {/* Rulers Overlay */}
      {showRulers && (
        <CanvasRulers
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      )}
      {/* Background Infinite Grid */}
      {showGrid && (
        <svg className="canvas-grid-pattern" width="100%" height="100%">
          <defs>
            <pattern
              id="grid-dots"
              width={20 * zoom}
              height={20 * zoom}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${vpX % (20 * zoom)}, ${vpY % (20 * zoom)})`}
            >
              <circle cx="1" cy="1" r="1" fill="rgba(255, 255, 255, 0.08)" />
            </pattern>
            <pattern
              id="grid-lines"
              width={100 * zoom}
              height={100 * zoom}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${vpX % (100 * zoom)}, ${vpY % (100 * zoom)})`}
            >
              <path
                d={`M ${100 * zoom} 0 L 0 0 0 ${100 * zoom}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-lines)" />
          <rect width="100%" height="100%" fill="url(#grid-dots)" />
        </svg>
      )}

      {/* Canvas Transform Root */}
      <div
        className="canvas-world"
        style={{
          transform: `translate(${vpX}px, ${vpY}px) scale(${zoom})`,
        }}
      >
        {/* Render Frame objects first, then root objects */}
        {objects.map((obj) => (
          <CanvasObjectRenderer
            key={obj.id}
            object={obj}
            isSelected={selectedIds.includes(obj.id)}
            isHovered={hoveredId === obj.id}
            onSelect={handleObjectSelect}
            onDoubleClick={handleDoubleClick}
          />
        ))}

        {/* Smart Guide Overlay Lines */}
        {activeGuides.map((guide, idx) => (
          <div
            key={idx}
            className="canvas-smart-guide-line"
            style={
              guide.orientation === 'vertical'
                ? {
                    position: 'absolute',
                    left: `${guide.position}px`,
                    top: `${guide.start}px`,
                    width: `${1 / zoom}px`,
                    height: `${guide.end - guide.start}px`,
                    backgroundColor: '#ec4899',
                    pointerEvents: 'none',
                    zIndex: 900,
                  }
                : {
                    position: 'absolute',
                    left: `${guide.start}px`,
                    top: `${guide.position}px`,
                    width: `${guide.end - guide.start}px`,
                    height: `${1 / zoom}px`,
                    backgroundColor: '#ec4899',
                    pointerEvents: 'none',
                    zIndex: 900,
                  }
            }
          />
        ))}

        {/* Selection Bounding Box & Handles */}
        {selectionBbox && selectedObjects.length > 0 && !dragState?.type?.includes('create') && (
          <SelectionOverlay
            bbox={selectionBbox}
            zoom={zoom}
            rotation={selectedObjects.length === 1 ? selectedObjects[0].rotation : 0}
            isMultiSelect={selectedObjects.length > 1}
            onResizeStart={handleResizeStart}
            onMoveStart={handleSelectionMoveStart}
          />
        )}

        {/* Prototype Connection Lines and Handles Overlay */}
        <PrototypeConnectionOverlay zoom={zoom} />

        {/* Selected Frame Auto Layout Visualizer */}
        {selectedObjects.length === 1 &&
          selectedObjects[0].type === 'frame' &&
          (selectedObjects[0] as FrameObject).layoutMode !== 'none' && (
            <AutoLayoutVisualizer
              frame={selectedObjects[0] as FrameObject}
              zoom={zoom}
            />
          )}

        {/* Drop Target Frame Highlight Overlay */}
        {hoveredFrameId && (
          (() => {
            const hFrame = objects.find((o) => o.id === hoveredFrameId);
            if (!hFrame) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${hFrame.x}px`,
                  top: `${hFrame.y}px`,
                  width: `${hFrame.width}px`,
                  height: `${hFrame.height}px`,
                  border: `${2 / zoom}px solid #a855f7`,
                  backgroundColor: 'rgba(168, 85, 247, 0.08)',
                  pointerEvents: 'none',
                  zIndex: 800,
                  borderRadius: `${(hFrame as FrameObject).cornerRadius || 0}px`,
                }}
              />
            );
          })()
        )}

        {/* Inline Text Editor */}
        {currentEditingObj && currentEditingObj.type === 'text' && (
          <textarea
            autoFocus
            style={{
              position: 'absolute',
              left: `${currentEditingObj.x}px`,
              top: `${currentEditingObj.y}px`,
              width: `${Math.max(currentEditingObj.width, 100)}px`,
              height: `${Math.max(currentEditingObj.height, 30)}px`,
              fontSize: `${currentEditingObj.fontSize}px`,
              fontWeight: currentEditingObj.fontWeight,
              fontFamily: currentEditingObj.fontFamily,
              color: currentEditingObj.fill,
              letterSpacing: `${currentEditingObj.letterSpacing || 0}px`,
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid #6366f1',
              borderRadius: '4px',
              padding: '2px 4px',
              outline: 'none',
              resize: 'none',
              lineHeight: currentEditingObj.lineHeight,
              zIndex: 1000,
            }}
            value={currentEditingObj.content}
            onChange={(e) => {
              useDocumentStore.getState().updateObject(currentEditingObj.id, { content: e.target.value });
            }}
            onBlur={() => setEditingTextId(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingTextId(null);
              }
            }}
          />
        )}

        {/* Creation Ghost Preview */}
        {ghostBox && (
          <div
            className="canvas-creation-ghost"
            style={{
              left: `${ghostBox.x}px`,
              top: `${ghostBox.y}px`,
              width: `${ghostBox.width}px`,
              height: `${ghostBox.height}px`,
              borderRadius: activeTool === 'ellipse' ? '50%' : activeTool === 'frame' ? '8px' : '0px',
            }}
          />
        )}

        {/* Marquee Selection Drag Box */}
        {marqueeBox && (
          <div
            className="canvas-marquee-box"
            style={{
              left: `${marqueeBox.minX}px`,
              top: `${marqueeBox.minY}px`,
              width: `${marqueeBox.maxX - marqueeBox.minX}px`,
              height: `${marqueeBox.maxY - marqueeBox.minY}px`,
            }}
          />
        )}
      </div>

      {/* Live Multiplayer Cursors, Selections, and Canvas Comments */}
      <LiveSelectionBoxes />
      <LiveCursorsOverlay />
      <CanvasCommentsLayer />
    </div>
  );
};
