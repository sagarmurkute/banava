import React from 'react';
import { useViewportStore } from '../state/useViewportStore';
import './rulers.css';

interface CanvasRulersProps {
  containerWidth: number;
  containerHeight: number;
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({
  containerWidth,
  containerHeight,
}) => {
  const { x: vpX, y: vpY, zoom } = useViewportStore();

  const RULER_THICKNESS = 20;

  // Calculate step interval based on zoom
  let step = 100;
  if (zoom > 2) step = 50;
  if (zoom > 4) step = 10;
  if (zoom < 0.5) step = 200;
  if (zoom < 0.25) step = 500;

  // Top Horizontal Ruler markers
  const horizontalMarkers = [];
  const startCanvasX = Math.floor((-vpX) / (step * zoom)) * step;
  const endCanvasX = Math.ceil((containerWidth - vpX) / (step * zoom)) * step;

  for (let cX = startCanvasX; cX <= endCanvasX; cX += step) {
    const screenX = cX * zoom + vpX;
    if (screenX >= RULER_THICKNESS && screenX <= containerWidth) {
      horizontalMarkers.push({
        coord: cX,
        screenPos: screenX,
      });
    }
  }

  // Left Vertical Ruler markers
  const verticalMarkers = [];
  const startCanvasY = Math.floor((-vpY) / (step * zoom)) * step;
  const endCanvasY = Math.ceil((containerHeight - vpY) / (step * zoom)) * step;

  for (let cY = startCanvasY; cY <= endCanvasY; cY += step) {
    const screenY = cY * zoom + vpY;
    if (screenY >= RULER_THICKNESS && screenY <= containerHeight) {
      verticalMarkers.push({
        coord: cY,
        screenPos: screenY,
      });
    }
  }

  return (
    <div className="canvas-rulers-wrapper">
      {/* Top Left Corner */}
      <div className="ruler-corner" />

      {/* Horizontal Ruler (Top) */}
      <div className="ruler-horizontal">
        {horizontalMarkers.map((m) => (
          <div
            key={m.coord}
            className="ruler-tick-h"
            style={{ left: `${m.screenPos}px` }}
          >
            <span className="ruler-tick-label">{m.coord}</span>
          </div>
        ))}
      </div>

      {/* Vertical Ruler (Left) */}
      <div className="ruler-vertical">
        {verticalMarkers.map((m) => (
          <div
            key={m.coord}
            className="ruler-tick-v"
            style={{ top: `${m.screenPos}px` }}
          >
            <span className="ruler-tick-label">{m.coord}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
