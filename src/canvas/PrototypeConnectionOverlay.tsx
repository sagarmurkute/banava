import React, { useState } from 'react';
import type { SceneObject } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useUIStore } from '../state/useUIStore';

interface PrototypeConnectionOverlayProps {
  zoom: number;
}

export const PrototypeConnectionOverlay: React.FC<PrototypeConnectionOverlayProps> = ({ zoom }) => {
  const { doc, createConnection } = useDocumentStore();
  const { selectedIds } = useSelectionStore();
  const { editorMode, showConnectionLines } = useUIStore();

  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);

  if (editorMode !== 'prototype') return null;

  const activePage = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  const objects = activePage?.objects || [];
  const objectMap = new Map<string, SceneObject>();
  objects.forEach((o) => objectMap.set(o.id, o));

  const proto = doc.prototype;
  const flows = Object.values(proto?.flows || {});
  const connections = Object.values(proto?.connections || {});

  // Compute center/exit point of an object
  const getExitPoint = (obj: SceneObject) => {
    return {
      x: obj.x + obj.width,
      y: obj.y + obj.height / 2,
    };
  };

  const getEntryPoint = (obj: SceneObject) => {
    return {
      x: obj.x,
      y: obj.y + obj.height / 2,
    };
  };

  const handleStartDragHandle = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingSourceId(sourceId);

    const handleMouseMove = (moveEv: MouseEvent) => {
      // Find mouse world canvas coordinates
      const canvasEl = document.querySelector('.canvas-world') as HTMLElement;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const worldX = (moveEv.clientX - rect.left) / zoom;
        const worldY = (moveEv.clientY - rect.top) / zoom;
        setDragCurrentPos({ x: worldX, y: worldY });
      }
    };

    const handleMouseUp = (upEv: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Check drop target frame under mouse
      const canvasEl = document.querySelector('.canvas-world') as HTMLElement;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const dropX = (upEv.clientX - rect.left) / zoom;
        const dropY = (upEv.clientY - rect.top) / zoom;

        // Find frame under cursor
        const targetFrame = objects
          .filter((o) => o.type === 'frame' || o.type === 'instance')
          .find(
            (f) =>
              dropX >= f.x &&
              dropX <= f.x + f.width &&
              dropY >= f.y &&
              dropY <= f.y + f.height &&
              f.id !== sourceId
          );

        if (targetFrame) {
          createConnection(sourceId, targetFrame.id);
        }
      }

      setDraggingSourceId(null);
      setDragCurrentPos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="prototype-connection-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 850,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '10000px',
          height: '10000px',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <marker
            id="proto-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#818cf8" />
          </marker>
          <marker
            id="proto-arrow-hover"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
          </marker>
          <marker
            id="proto-arrow-warning"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Existing Connections */}
        {showConnectionLines &&
          connections.map((conn) => {
            const src = objectMap.get(conn.sourceNodeId);
            const dest = conn.destinationNodeId ? objectMap.get(conn.destinationNodeId) : null;
            if (!src) return null;

            const isSelected = selectedIds.includes(conn.sourceNodeId);
            const isHovered = hoveredConnId === conn.id;
            const isBroken = !dest;

            const p1 = getExitPoint(src);
            const p2 = dest ? getEntryPoint(dest) : { x: p1.x + 100, y: p1.y };

            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const d = `M ${p1.x} ${p1.y} C ${p1.x + Math.max(dx, 40)} ${p1.y}, ${
              p2.x - Math.max(dx, 40)
            } ${p2.y}, ${p2.x} ${p2.y}`;

            const strokeColor = isBroken
              ? '#ef4444'
              : isHovered || isSelected
              ? '#c084fc'
              : 'rgba(129, 140, 248, 0.75)';

            return (
              <g
                key={conn.id}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredConnId(conn.id)}
                onMouseLeave={() => setHoveredConnId(null)}
              >
                {/* Thick invisible path for easy hover targeting */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={16 / zoom} />
                {/* Visible curved line */}
                <path
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={(isHovered || isSelected ? 2.5 : 1.5) / zoom}
                  strokeDasharray={isBroken ? '6 4' : undefined}
                  markerEnd={
                    isBroken
                      ? 'url(#proto-arrow-warning)'
                      : isHovered || isSelected
                      ? 'url(#proto-arrow-hover)'
                      : 'url(#proto-arrow)'
                  }
                />
              </g>
            );
          })}

        {/* Live Dragging Connection Line */}
        {draggingSourceId && dragCurrentPos && (
          (() => {
            const src = objectMap.get(draggingSourceId);
            if (!src) return null;
            const p1 = getExitPoint(src);
            const p2 = dragCurrentPos;
            const dx = Math.abs(p2.x - p1.x) * 0.5;
            const d = `M ${p1.x} ${p1.y} C ${p1.x + Math.max(dx, 40)} ${p1.y}, ${
              p2.x - Math.max(dx, 40)
            } ${p2.y}, ${p2.x} ${p2.y}`;

            return (
              <path
                d={d}
                fill="none"
                stroke="#c084fc"
                strokeWidth={2 / zoom}
                strokeDasharray="4 3"
                markerEnd="url(#proto-arrow-hover)"
              />
            );
          })()
        )}
      </svg>

      {/* Flow Starting Point Floating Badges */}
      {flows.map((flow) => {
        const startFrame = objectMap.get(flow.startingPointId);
        if (!startFrame) return null;

        return (
          <div
            key={flow.id}
            style={{
              position: 'absolute',
              left: `${startFrame.x}px`,
              top: `${startFrame.y - 32}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: 900,
            }}
          >
            <span>▶</span>
            <span>{flow.name}</span>
          </div>
        );
      })}

      {/* Connection Handle Node on Selected Objects */}
      {selectedIds.length === 1 && (
        (() => {
          const selected = objectMap.get(selectedIds[0]);
          if (!selected) return null;

          const handleX = selected.x + selected.width;
          const handleY = selected.y + selected.height / 2;

          return (
            <div
              style={{
                position: 'absolute',
                left: `${handleX - 8 / zoom}px`,
                top: `${handleY - 8 / zoom}px`,
                width: `${16 / zoom}px`,
                height: `${16 / zoom}px`,
                borderRadius: '50%',
                backgroundColor: '#818cf8',
                border: `${2 / zoom}px solid #ffffff`,
                boxShadow: '0 0 10px rgba(129, 140, 248, 0.8)',
                cursor: 'crosshair',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: `${10 / zoom}px`,
                fontWeight: 700,
                zIndex: 950,
                transition: 'transform 0.15s ease',
              }}
              title="Drag to connect to another frame"
              onMouseDown={(e) => handleStartDragHandle(e, selected.id)}
            >
              +
            </div>
          );
        })()
      )}
    </div>
  );
};
