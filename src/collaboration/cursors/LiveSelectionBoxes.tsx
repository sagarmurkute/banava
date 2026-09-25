/**
 * Remote Collaborator Selection Bounding Boxes Overlay
 */

import React from 'react';
import { usePresenceStore } from '../presence/usePresenceStore';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useViewportStore } from '../../state/useViewportStore';

export const LiveSelectionBoxes: React.FC = () => {
  const { collaborators, currentUserId } = usePresenceStore();
  const { doc } = useDocumentStore();
  const { zoom, x: panX, y: panY } = useViewportStore();

  if (!doc) return null;

  const activePage = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
  if (!activePage) return null;

  const collaboratorList = Object.values(collaborators).filter(
    (c) =>
      c.userId !== currentUserId &&
      c.selectedObjectIds &&
      c.selectedObjectIds.length > 0 &&
      Date.now() - c.lastActive < 60000
  );

  if (collaboratorList.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {collaboratorList.map((c) => {
        return c.selectedObjectIds.map((objId) => {
          const obj = activePage.objects.find((o) => o.id === objId);
          if (!obj) return null;

          const screenX = obj.x * zoom + panX;
          const screenY = obj.y * zoom + panY;
          const screenW = obj.width * zoom;
          const screenH = obj.height * zoom;

          return (
            <div
              key={`${c.userId}_${objId}`}
              className="absolute pointer-events-none border-2 transition-all duration-75"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
                borderColor: c.color,
                borderRadius: '2px',
              }}
            >
              {/* User Pill on top-right of bounding box */}
              <div
                className="absolute -top-5 right-0 px-1.5 py-0.2 rounded-t text-[10px] font-medium text-white shadow-xs"
                style={{ backgroundColor: c.color }}
              >
                {c.userName}
              </div>
            </div>
          );
        });
      })}
    </div>
  );
};
