import React from 'react';
import type { FrameObject } from '../types/document';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface AutoLayoutVisualizerProps {
  frame: FrameObject;
  zoom: number;
}

export const AutoLayoutVisualizer: React.FC<AutoLayoutVisualizerProps> = ({ frame, zoom }) => {
  if (!frame.layoutMode || frame.layoutMode === 'none') return null;

  const { padding = { top: 0, right: 0, bottom: 0, left: 0 }, itemSpacing = 0, layoutMode } = frame;
  const isHorizontal = layoutMode === 'horizontal';

  return (
    <div
      className="auto-layout-visualizer"
      style={{
        position: 'absolute',
        left: `${frame.x}px`,
        top: `${frame.y}px`,
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        pointerEvents: 'none',
        zIndex: 850,
      }}
    >
      {/* Padding Overlay Box */}
      <div
        style={{
          position: 'absolute',
          top: `${padding.top}px`,
          left: `${padding.left}px`,
          right: `${padding.right}px`,
          bottom: `${padding.bottom}px`,
          border: `${1 / zoom}px dashed rgba(99, 102, 241, 0.4)`,
          backgroundColor: 'rgba(99, 102, 241, 0.03)',
        }}
      />

      {/* Direction & Gap Badge */}
      <div
        style={{
          position: 'absolute',
          top: `${-24 / zoom}px`,
          right: '0px',
          display: 'flex',
          alignItems: 'center',
          gap: `${4 / zoom}px`,
          fontSize: `${10 / zoom}px`,
          padding: `${2 / zoom}px ${6 / zoom}px`,
          borderRadius: `${3 / zoom}px`,
          backgroundColor: '#312e81',
          color: '#c7d2fe',
          border: `${1 / zoom}px solid #6366f1`,
          whiteSpace: 'nowrap',
        }}
      >
        {isHorizontal ? <ArrowRight size={10 / zoom} /> : <ArrowDown size={10 / zoom} />}
        <span>
          {isHorizontal ? 'H' : 'V'} Layout · Gap {itemSpacing}px
        </span>
      </div>
    </div>
  );
};
