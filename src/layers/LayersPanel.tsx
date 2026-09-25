import React, { useState } from 'react';
import {
  Frame,
  Square,
  Circle,
  Minus,
  Type,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import type { SceneObject, ObjectType } from '../types/document';
import { IconButton } from '../components/ui/IconButton';
import './layers.css';

export const LayersPanel: React.FC = () => {
  const { getActivePage, toggleVisibility, toggleLock, renameObject, deleteObjects, reorderObject } = useDocumentStore();
  const { selectedIds, select, hoveredId, setHovered } = useSelectionStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [collapsedFrames, setCollapsedFrames] = useState<Record<string, boolean>>({});

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  // Group objects by parentId (frames vs roots)
  const rootObjects = objects.filter((o) => !o.parentId);
  // Display reversed (top of canvas visual stack is top in layers panel)
  const displayRoots = [...rootObjects].reverse();

  const toggleFrameCollapse = (frameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFrames((prev) => ({ ...prev, [frameId]: !prev[frameId] }));
  };

  const handleStartRename = (obj: SceneObject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(obj.id);
    setEditingName(obj.name);
  };

  const handleCommitRename = (objId: string) => {
    if (editingName.trim()) {
      renameObject(objId, editingName);
    }
    setEditingId(null);
  };

  const getObjectIcon = (type: ObjectType) => {
    switch (type) {
      case 'frame':
        return <Frame size={14} className="layer-icon frame" />;
      case 'rectangle':
        return <Square size={14} className="layer-icon rect" />;
      case 'ellipse':
        return <Circle size={14} className="layer-icon ellipse" />;
      case 'line':
        return <Minus size={14} className="layer-icon line" />;
      case 'text':
        return <Type size={14} className="layer-icon text" />;
    }
  };

  const renderLayerItem = (obj: SceneObject, depth = 0) => {
    const isSelected = selectedIds.includes(obj.id);
    const isHovered = hoveredId === obj.id;
    const isEditing = editingId === obj.id;
    const isFrame = obj.type === 'frame';
    const isCollapsed = collapsedFrames[obj.id];

    // Children if frame
    const children = objects.filter((o) => o.parentId === obj.id);

    return (
      <div key={obj.id} className="layer-item-wrapper">
        <div
          className={`layer-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={(e) => select(obj.id, e.shiftKey || e.ctrlKey || e.metaKey)}
          onMouseEnter={() => setHovered(obj.id)}
          onMouseLeave={() => setHovered(null)}
          onDoubleClick={(e) => handleStartRename(obj, e)}
        >
          {/* Frame Collapse Arrow */}
          {isFrame && children.length > 0 ? (
            <span
              className="layer-collapse-toggle"
              onClick={(e) => toggleFrameCollapse(obj.id, e)}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </span>
          ) : (
            <span className="layer-collapse-spacer" />
          )}

          {/* Object Type Icon */}
          <span className="layer-type-icon">{getObjectIcon(obj.type)}</span>

          {/* Object Name / Editable Name */}
          <div className="layer-name-container">
            {isEditing ? (
              <input
                type="text"
                autoFocus
                className="layer-name-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleCommitRename(obj.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitRename(obj.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="layer-name-label truncate" title={obj.name}>
                {obj.name}
              </span>
            )}
          </div>

          {/* Actions: Visibility, Lock */}
          <div className="layer-actions">
            <button
              className={`layer-action-btn ${!obj.visible ? 'active' : ''}`}
              title={obj.visible ? 'Hide layer' : 'Show layer'}
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(obj.id);
              }}
            >
              {obj.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-muted" />}
            </button>
            <button
              className={`layer-action-btn ${obj.locked ? 'active' : ''}`}
              title={obj.locked ? 'Unlock layer' : 'Lock layer'}
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(obj.id);
              }}
            >
              {obj.locked ? <Lock size={13} className="text-accent" /> : <Unlock size={13} />}
            </button>
          </div>
        </div>

        {/* Render Nested Frame Children */}
        {isFrame && !isCollapsed && children.length > 0 && (
          <div className="layer-children-tree">
            {[...children].reverse().map((child) => renderLayerItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="layers-panel-container">
      {/* Header Controls for selected layer */}
      <div className="layers-panel-toolbar">
        <span className="layers-header-title">Layers ({objects.length})</span>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1">
            <IconButton
              icon={<ArrowUp size={13} />}
              size="sm"
              tooltip="Bring forward"
              onClick={() => reorderObject(selectedIds[0], 'up')}
            />
            <IconButton
              icon={<ArrowDown size={13} />}
              size="sm"
              tooltip="Send backward"
              onClick={() => reorderObject(selectedIds[0], 'down')}
            />
            <IconButton
              icon={<Trash2 size={13} />}
              size="sm"
              tooltip="Delete selected"
              onClick={() => deleteObjects(selectedIds)}
            />
          </div>
        )}
      </div>

      {/* Layers List */}
      <div className="layers-list-scroll">
        {displayRoots.length === 0 ? (
          <div className="layers-empty-state">
            <span>No layers on this page</span>
            <span className="layers-empty-hint">Create shapes using the toolbar</span>
          </div>
        ) : (
          displayRoots.map((obj) => renderLayerItem(obj, 0))
        )}
      </div>
    </div>
  );
};
