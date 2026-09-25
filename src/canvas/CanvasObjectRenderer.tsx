import React, { useEffect, useState } from 'react';
import type {
  SceneObject,
  RectangleObject,
  FrameObject,
  EllipseObject,
  PolygonObject,
  LineObject,
  TextObject,
  ImageObject,
} from '../types/document';
import { generatePolygonPoints } from '../utils/polygon';
import { getAssetBlob } from '../storage/indexedDb';

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
  const [imageSrc, setImageSrc] = useState<string | null>(
    object.type === 'image' ? (object as ImageObject).src || null : null
  );

  // Load binary asset from IndexedDB if not cached in memory
  useEffect(() => {
    if (object.type === 'image') {
      const imgObj = object as ImageObject;
      if (!imgObj.src && imgObj.assetId) {
        getAssetBlob(imgObj.assetId).then((blob) => {
          if (blob) {
            if (typeof blob === 'string') {
              setImageSrc(blob);
            } else {
              const url = URL.createObjectURL(blob);
              setImageSrc(url);
            }
          }
        });
      } else if (imgObj.src) {
        setImageSrc(imgObj.src);
      }
    }
  }, [object]);

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

    case 'polygon': {
      const poly = object as PolygonObject;
      const points = generatePolygonPoints(
        poly.width,
        poly.height,
        poly.points || 3,
        poly.isStar,
        poly.starRatio || 0.5
      );

      return (
        <div
          id={`obj-${poly.id}`}
          style={style}
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => onDoubleClick?.(e, poly.id)}
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${poly.width} ${poly.height}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <polygon
              points={points}
              fill={poly.fill || '#eab308'}
              stroke={poly.stroke || 'none'}
              strokeWidth={poly.strokeWidth || 0}
              strokeLinejoin="round"
            />
          </svg>
        </div>
      );
    }

    case 'image': {
      const img = object as ImageObject;
      return (
        <div
          id={`obj-${img.id}`}
          style={{
            ...style,
            borderRadius: `${img.cornerRadius || 0}px`,
            overflow: 'hidden',
            backgroundColor: '#1e293b',
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => onDoubleClick?.(e, img.id)}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={img.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: img.fit || 'cover',
                pointerEvents: 'none',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '11px',
              }}
            >
              Loading Image...
            </div>
          )}
        </div>
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
            borderRadius: line.lineCap === 'round' ? `${(line.strokeWidth || 2) / 2}px` : '0px',
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
            letterSpacing: `${text.letterSpacing || 0}px`,
            whiteSpace: text.autoResize === 'auto-width' ? 'nowrap' : 'pre-wrap',
            wordBreak: text.autoResize === 'auto-width' ? 'normal' : 'break-word',
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
