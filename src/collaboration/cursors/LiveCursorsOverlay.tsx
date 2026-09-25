/**
 * Live Multiplayer Cursors Canvas Overlay
 */

import React from 'react';
import { usePresenceStore } from '../presence/usePresenceStore';
import { useViewportStore } from '../../state/useViewportStore';

export const LiveCursorsOverlay: React.FC = () => {
  const { collaborators, currentUserId } = usePresenceStore();
  const { zoom, x: panX, y: panY } = useViewportStore();

  const collaboratorList = Object.values(collaborators).filter(
    (c) => c.userId !== currentUserId && c.cursor !== null && Date.now() - c.lastActive < 60000
  );

  if (collaboratorList.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {collaboratorList.map((c) => {
        if (!c.cursor) return null;

        // Transform canvas coordinate to screen viewport coordinate
        const screenX = c.cursor.x * zoom + panX;
        const screenY = c.cursor.y * zoom + panY;

        return (
          <div
            key={c.userId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out pointer-events-none"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
            }}
          >
            {/* SVG Cursor Pointer */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-md"
            >
              <polygon
                points="3 3 10.07 19.97 12.58 12.58 19.97 10.07 3 3"
                fill={c.color}
              />
            </svg>

            {/* Name Badge */}
            <div
              className="absolute left-3 top-4 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white whitespace-nowrap shadow-md flex items-center gap-1"
              style={{ backgroundColor: c.color }}
            >
              <span>{c.userName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
