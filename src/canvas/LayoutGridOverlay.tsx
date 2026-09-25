import React from 'react';
import type { FrameObject } from '../types/document';

interface LayoutGridOverlayProps {
  frame: FrameObject;
}

export const LayoutGridOverlay: React.FC<LayoutGridOverlayProps> = ({ frame }) => {
  if (!frame.layoutGrids || frame.layoutGrids.length === 0) return null;

  return (
    <div
      className="frame-layout-grid-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 2,
      }}
    >
      {frame.layoutGrids.map((grid, idx) => {
        if (!grid.enabled) return null;

        if (grid.type === 'columns') {
          const count = Math.max(1, grid.count || 12);
          const gutter = grid.gutter ?? 20;
          const margin = grid.margin ?? 20;
          const totalGutters = (count - 1) * gutter;
          const totalMargins = margin * 2;
          const availableWidth = Math.max(0, frame.width - totalMargins - totalGutters);
          const colWidth = availableWidth / count;
          const color = grid.color || 'rgba(239, 68, 68, 0.1)';

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${margin}px`,
                right: `${margin}px`,
                display: 'flex',
                gap: `${gutter}px`,
              }}
            >
              {Array.from({ length: count }).map((_, cIdx) => (
                <div
                  key={cIdx}
                  style={{
                    width: `${colWidth}px`,
                    height: '100%',
                    backgroundColor: color,
                    borderLeft: `1px solid ${color.replace(/[\d.]+\)$/, '0.25)')}`,
                    borderRight: `1px solid ${color.replace(/[\d.]+\)$/, '0.25)')}`,
                  }}
                />
              ))}
            </div>
          );
        }

        if (grid.type === 'rows') {
          const count = Math.max(1, grid.count || 6);
          const gutter = grid.gutter ?? 20;
          const margin = grid.margin ?? 20;
          const totalGutters = (count - 1) * gutter;
          const totalMargins = margin * 2;
          const availableHeight = Math.max(0, frame.height - totalMargins - totalGutters);
          const rowHeight = availableHeight / count;
          const color = grid.color || 'rgba(59, 130, 246, 0.1)';

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${margin}px`,
                bottom: `${margin}px`,
                display: 'flex',
                flexDirection: 'column',
                gap: `${gutter}px`,
              }}
            >
              {Array.from({ length: count }).map((_, rIdx) => (
                <div
                  key={rIdx}
                  style={{
                    height: `${rowHeight}px`,
                    width: '100%',
                    backgroundColor: color,
                    borderTop: `1px solid ${color.replace(/[\d.]+\)$/, '0.25)')}`,
                    borderBottom: `1px solid ${color.replace(/[\d.]+\)$/, '0.25)')}`,
                  }}
                />
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
