import React from 'react';
import type { SceneObject, RectangleObject, FrameObject, EllipseObject, LineObject, TextObject } from '../types/document';

interface CanvasObjectRendererProps {
  object: SceneObject;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (e: React.MouseEvent, objId: string) => void;
  onDoubleClick?: (e: React.MouseEvent, objId: string) => void;
}

export const CanvasObjectRenderer: React.FC<CanvasObjectRendererProps> = ({
  object,
  isSelected,
  isHovered,
  onSelect,
  onDoubleClick,
}) => {
  if (!object.visible) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${object.x}px`,
    top: `${object.y}px`,
    width: `${object.width}px`,
    height: `${object.height}px`,
    transform: object.rotation ? `rotate(${object.rotation}deg)` : undefined,
    transformOrigin: 'center center',
    opacity: object.opacity !== undefined ? object.opacity / 100 : 1,
    pointerEvents: object.locked ? 'none' : 'auto',
    cursor: 'pointer',
    outline: isHovered && !isSelected ? '1.5px solid rgba(99, 102, 241, 0.7)' : undefined,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    onSelect(e, object.id);
  };

  switch (object.type) {
    case 'frame': {
      const frame = object as FrameObject;
      return (
        <div
          id={`obj-${frame.id}`}
          style={{
            ...style,
            backgroundColor: frame.fill || 'transparent',
            border: frame.stroke ? `${frame.strokeWidth || 1}px solid ${frame.stroke}` : undefined,
            borderRadius: `${frame.cornerRadius || 0}px`,
            overflow: frame.clipsContent ? 'hidden' : 'visible',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => onDoubleClick?.(e, frame.id)}
        >
          {/* Frame Label */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '0px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#94a3b8',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {frame.name}
          </div>
        </div>
      );
    }

    case 'rectangle': {
      const rect = object as RectangleObject;
      return (
        <div
          id={`obj-${rect.id}`}
          style={{
            ...style,
            backgroundColor: rect.fill || '#3b82f6',
            border: rect.stroke ? `${rect.strokeWidth || 1}px solid ${rect.stroke}` : undefined,
            borderRadius: `${rect.cornerRadius || 0}px`,
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => onDoubleClick?.(e, rect.id)}
        />
      );
    }

    case 'ellipse': {
      const ellipse = object as EllipseObject;
      return (
        <div
          id={`obj-${ellipse.id}`}
          style={{
            ...style,
            backgroundColor: ellipse.fill || '#8b5cf6',
            border: ellipse.stroke ? `${ellipse.strokeWidth || 1}px solid ${ellipse.stroke}` : undefined,
            borderRadius: '50%',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => onDoubleClick?.(e, ellipse.id)}
        />
      );
    }

    case 'line': {
      const line = object as LineObject;
      return (
        <div
          id={`obj-${line.id}`}
          style={{
            ...style,
            height: `${Math.max(line.strokeWidth || 2, 2)}px`,
            backgroundColor: line.stroke || '#94a3b8',
            borderRadius: `${(line.strokeWidth || 2) / 2}px`,
          }}
          onMouseDown={handleMouseDown}
        />
      );
    }

    case 'text': {
      const text = object as TextObject;
      return (
        <div
          id={`obj-${text.id}`}
          style={{
            ...style,
            color: text.fill || '#ffffff',
            fontSize: `${text.fontSize || 14}px`,
            fontWeight: text.fontWeight || 400,
            fontFamily: text.fontFamily || 'Inter, sans-serif',
            textAlign: text.textAlign || 'left',
            lineHeight: text.lineHeight || 1.2,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: 'flex',
            alignItems: 'center',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => onDoubleClick?.(e, text.id)}
        >
          {text.content}
        </div>
      );
    }

    default:
      return null;
  }
};
