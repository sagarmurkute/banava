import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useViewportStore } from '../state/useViewportStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useToolStore } from '../state/useToolStore';
import { useUIStore } from '../state/useUIStore';
import { CanvasObjectRenderer } from './CanvasObjectRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { calculateBoundingBox, screenToCanvas, snap } from '../utils/geometry';
import { generateId } from '../utils/id';
import type { SceneObject, ResizeHandleType, BoundingBox } from '../types/document';
import './canvas.css';

interface DragState {
  type: 'pan' | 'create' | 'move' | 'resize' | 'marquee';
  startX: number;
  startY: number;
  canvasStartX: number;
  canvasStartY: number;
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
  const { getActivePage, addObject, updateObjects, commitHistory } = useDocumentStore();
  const { selectedIds, select, selectMultiple, deselectAll, hoveredId } = useSelectionStore();
  const { activeTool, setActiveTool, isSpacePressed } = useToolStore();
  const { showGrid, snapToGrid, gridSize } = useUIStore();

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  // Local state for dragging & previews
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [ghostBox, setGhostBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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
      // Zoom centered at cursor
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomTo(zoom * zoomFactor, e.clientX, e.clientY, rect);
    } else {
      // Pan
      pan(-e.deltaX, -e.deltaY);
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // If inline editing text, finish edit
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

    // If active tool is a creation tool
    if (activeTool !== 'select') {
      if (activeTool === 'text') {
        // Create text directly at click point
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
        };
        addObject(newText);
        select(newText.id);
        setActiveTool('select');
        setEditingTextId(newText.id);
        return;
      }

      // Start drag-to-create for frame, rectangle, ellipse, line
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
      // Start marquee selection
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

    const isAlreadySelected = selectedIds.includes(objId);

    if (e.shiftKey) {
      select(objId, true);
    } else if (!isAlreadySelected) {
      select(objId, false);
    }

    // Prepare move drag
    const currentSelected = !isAlreadySelected && !e.shiftKey
      ? [objId]
      : selectedIds.includes(objId) ? selectedIds : [...selectedIds, objId];

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
    });
  };

  // Selection Overlay Move Start
  const handleSelectionMoveStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpacePressed) return;

    const initialMap: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const id of selectedIds) {
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
        const width = Math.abs(currX - dragState.canvasStartX);
        const height = activeTool === 'line' ? 0 : Math.abs(currY - dragState.canvasStartY);

        setGhostBox({ x: minX, y: minY, width, height });
      } else if (dragState.type === 'marquee') {
        const minX = Math.min(dragState.canvasStartX, currX);
        const minY = Math.min(dragState.canvasStartY, currY);
        const maxX = Math.max(dragState.canvasStartX, currX);
        const maxY = Math.max(dragState.canvasStartY, currY);

        setMarqueeBox({ minX, minY, maxX, maxY });

        // Select objects intersecting with marquee
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
        const dx = currX - dragState.canvasStartX;
        const dy = currY - dragState.canvasStartY;

        const updates: Record<string, Partial<SceneObject>> = {};
        for (const [id, init] of Object.entries(dragState.initialObjects)) {
          let newX = init.x + dx;
          let newY = init.y + dy;
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

        const newW = newMaxX - newMinX;
        const newH = newMaxY - newMinY;

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
    };

    const handleMouseUp = () => {
      if (!dragState) return;

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

  // Editing Text helper
  const currentEditingObj = objects.find((o) => o.id === editingTextId && o.type === 'text');

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ cursor: getCursor() }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
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
    </div>
  );
};
