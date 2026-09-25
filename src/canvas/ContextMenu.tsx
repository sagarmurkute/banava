import React, { useEffect, useRef } from 'react';
import {
  Copy,
  Scissors,
  Clipboard,
  CopyPlus,
  Trash2,
  Group,
  Ungroup,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useClipboardStore } from '../state/useClipboardStore';
import './contextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  canvasX,
  canvasY,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    getActivePage,
    deleteObjects,
    duplicateObjects,
    groupObjects,
    ungroupObjects,
    reorderObject,
    toggleVisibility,
    toggleLock,
  } = useDocumentStore();
  const { selectedIds, selectMultiple, select } = useSelectionStore();
  const { copy, cut, paste, copiedObjects } = useClipboardStore();

  const activePage = getActivePage();
  const objects = activePage?.objects || [];
  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));

  const hasSelection = selectedObjects.length > 0;
  const isMulti = selectedObjects.length > 1;
  const hasGroup = selectedObjects.some((o) => o.type === 'group');
  const allLocked = selectedObjects.every((o) => o.locked);
  const allHidden = selectedObjects.every((o) => !o.visible);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  // Adjust menu position so it doesn't overflow the screen
  const menuWidth = 200;
  const menuHeight = 320;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      className="canvas-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection && (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              cut(selectedObjects);
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <Scissors size={14} />
              <span>Cut</span>
            </div>
            <kbd>Ctrl+X</kbd>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              copy(selectedObjects);
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <Copy size={14} />
              <span>Copy</span>
            </div>
            <kbd>Ctrl+C</kbd>
          </div>
        </>
      )}

      {copiedObjects.length > 0 && (
        <div
          className="context-menu-item"
          onClick={() => {
            paste(canvasX, canvasY);
            onClose();
          }}
        >
          <div className="flex items-center gap-2">
            <Clipboard size={14} />
            <span>Paste Here</span>
          </div>
          <kbd>Ctrl+V</kbd>
        </div>
      )}

      {hasSelection && (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              const newIds = duplicateObjects(selectedIds);
              selectMultiple(newIds);
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <CopyPlus size={14} />
              <span>Duplicate</span>
            </div>
            <kbd>Ctrl+D</kbd>
          </div>

          <div
            className="context-menu-item text-danger"
            onClick={() => {
              deleteObjects(selectedIds);
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <Trash2 size={14} />
              <span>Delete</span>
            </div>
            <kbd>Del</kbd>
          </div>

          <div className="context-menu-divider" />

          {isMulti && (
            <div
              className="context-menu-item"
              onClick={() => {
                const gId = groupObjects(selectedIds);
                if (gId) select(gId);
                onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <Group size={14} />
                <span>Group Selection</span>
              </div>
              <kbd>Ctrl+G</kbd>
            </div>
          )}

          {hasGroup && (
            <div
              className="context-menu-item"
              onClick={() => {
                const groups = selectedObjects.filter((o) => o.type === 'group').map((g) => g.id);
                const rel = ungroupObjects(groups);
                if (rel.length > 0) selectMultiple(rel);
                onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <Ungroup size={14} />
                <span>Ungroup</span>
              </div>
              <kbd>Ctrl+Shift+G</kbd>
            </div>
          )}

          <div className="context-menu-divider" />

          {/* Layer Ordering */}
          <div
            className="context-menu-item"
            onClick={() => {
              reorderObject(selectedIds[0], 'top');
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <ChevronsUp size={14} />
              <span>Bring to Front</span>
            </div>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              reorderObject(selectedIds[0], 'up');
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <ArrowUp size={14} />
              <span>Bring Forward</span>
            </div>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              reorderObject(selectedIds[0], 'down');
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <ArrowDown size={14} />
              <span>Send Backward</span>
            </div>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              reorderObject(selectedIds[0], 'bottom');
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              <ChevronsDown size={14} />
              <span>Send to Back</span>
            </div>
          </div>

          <div className="context-menu-divider" />

          {/* Lock / Hide */}
          <div
            className="context-menu-item"
            onClick={() => {
              for (const id of selectedIds) toggleLock(id);
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              {allLocked ? <Unlock size={14} /> : <Lock size={14} />}
              <span>{allLocked ? 'Unlock' : 'Lock'}</span>
            </div>
          </div>

          <div
            className="context-menu-item"
            onClick={() => {
              for (const id of selectedIds) toggleVisibility(id);
              onClose();
            }}
          >
            <div className="flex items-center gap-2">
              {allHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{allHidden ? 'Show' : 'Hide'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
