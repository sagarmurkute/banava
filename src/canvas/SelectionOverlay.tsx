import React from 'react';
import type { BoundingBox, ResizeHandleType } from '../types/document';
import './canvas.css';

interface SelectionOverlayProps {
  bbox: BoundingBox;
  zoom: number;
  rotation?: number;
  isMultiSelect?: boolean;
  onResizeStart: (e: React.MouseEvent, handle: ResizeHandleType) => void;
  onMoveStart: (e: React.MouseEvent) => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  bbox,
  zoom,
  rotation = 0,
  isMultiSelect = false,
  onResizeStart,
  onMoveStart,
}) => {
  const handleSize = 8 / zoom; // keep handle size consistent visually on screen
  const borderOffset = 1 / zoom;

  const handles: { type: ResizeHandleType; x: number; y: number; cursor: string }[] = [
    { type: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
    { type: 'n', x: bbox.width / 2, y: 0, cursor: 'ns-resize' },
    { type: 'ne', x: bbox.width, y: 0, cursor: 'nesw-resize' },
    { type: 'e', x: bbox.width, y: bbox.height / 2, cursor: 'ew-resize' },
    { type: 'se', x: bbox.width, y: bbox.height, cursor: 'nwse-resize' },
    { type: 's', x: bbox.width / 2, y: bbox.height, cursor: 'ns-resize' },
    { type: 'sw', x: 0, y: bbox.height, cursor: 'nesw-resize' },
    { type: 'w', x: 0, y: bbox.height / 2, cursor: 'ew-resize' },
  ];

  return (
    <div
      className="selection-bounding-box"
      style={{
        position: 'absolute',
        left: `${bbox.minX}px`,
        top: `${bbox.minY}px`,
        width: `${bbox.width}px`,
        height: `${bbox.height}px`,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center center',
        pointerEvents: 'none',
      }}
    >
      {/* Selection Border */}
      <div
        className="selection-box-border"
        style={{
          border: `${borderOffset * 1.5}px solid #3b82f6`,
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
          cursor: 'move',
        }}
        onMouseDown={onMoveStart}
      />

      {/* Resize Handles */}
      {handles.map((h) => (
        <div
          key={h.type}
          className="selection-handle"
          style={{
            position: 'absolute',
            left: `${h.x - handleSize / 2}px`,
            top: `${h.y - handleSize / 2}px`,
            width: `${handleSize}px`,
            height: `${handleSize}px`,
            cursor: h.cursor,
            pointerEvents: 'auto',
            backgroundColor: '#ffffff',
            border: `${1 / zoom}px solid #3b82f6`,
            borderRadius: '2px',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, h.type);
          }}
        />
      ))}

      {/* Dimension Badge */}
      <div
        className="selection-dimension-badge"
        style={{
          position: 'absolute',
          bottom: `${-22 / zoom}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: `${10 / zoom}px`,
          padding: `${2 / zoom}px ${6 / zoom}px`,
          borderRadius: `${3 / zoom}px`,
          backgroundColor: '#1e293b',
          color: '#93c5fd',
          border: `${1 / zoom}px solid #3b82f6`,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {Math.round(bbox.width)} × {Math.round(bbox.height)}
        {isMultiSelect && ' (Multiple)'}
      </div>
    </div>
  );
};
