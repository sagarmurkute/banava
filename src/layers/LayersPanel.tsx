import React, { useState } from 'react';
import {
  Frame,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Image as ImageIcon,
  Folder,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowUp,
  ArrowDown,
  Group,
  Ungroup,
  Rows,
  Columns,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import type { SceneObject, FrameObject } from '../types/document';
import { IconButton } from '../components/ui/IconButton';
import './layers.css';

export const LayersPanel: React.FC = () => {
  const {
    getActivePage,
    toggleVisibility,
    toggleLock,
    renameObject,
    deleteObjects,
    reorderObject,
    reparentObject,
    groupObjects,
    ungroupObjects,
  } = useDocumentStore();
  const { selectedIds, select, selectMultiple, hoveredId, setHovered } = useSelectionStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  // Group objects by parentId (roots are objects with parentId === null)
  const rootObjects = objects.filter((o) => !o.parentId);
  // Display reversed (top of visual stack is top in layers panel)
  const displayRoots = [...rootObjects].reverse();

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedItems((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const handleGroupSelected = () => {
    const groupId = groupObjects(selectedIds);
    if (groupId) {
      select(groupId);
    }
  };

  const handleUngroupSelected = () => {
    const selectedGroups = objects.filter(
      (o) => selectedIds.includes(o.id) && (o.type === 'group' || o.type === 'frame')
    );
    const released = ungroupObjects(selectedGroups.map((g) => g.id));
    if (released.length > 0) {
      selectMultiple(released);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetObj: SceneObject) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedId || e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    setDragOverId(null);

    if (!sourceId || sourceId === targetObj.id) return;

    if (targetObj.type === 'frame' || targetObj.type === 'group') {
      // Reparent into this frame/container
      reparentObject(sourceId, targetObj.id);
    } else if (targetObj.parentId) {
      // Sibling in the same frame
      reparentObject(sourceId, targetObj.parentId);
    } else {
      // Move to root
      reparentObject(sourceId, null);
    }
  };

  const getObjectIcon = (obj: SceneObject) => {
    if (obj.type === 'frame') {
      const frame = obj as FrameObject;
      if (frame.layoutMode === 'horizontal') {
        return (
          <span title="Auto Layout (Horizontal)">
            <Columns size={13} className="layer-icon frame autolayout" />
          </span>
        );
      }
      if (frame.layoutMode === 'vertical') {
        return (
          <span title="Auto Layout (Vertical)">
            <Rows size={13} className="layer-icon frame autolayout" />
          </span>
        );
      }
      return <Frame size={14} className="layer-icon frame" />;
    }

    switch (obj.type) {
      case 'group':
        return <Folder size={14} className="layer-icon group" />;
      case 'rectangle':
        return <Square size={14} className="layer-icon rect" />;
      case 'ellipse':
        return <Circle size={14} className="layer-icon ellipse" />;
      case 'polygon':
        return <Triangle size={14} className="layer-icon polygon" />;
      case 'line':
        return <Minus size={14} className="layer-icon line" />;
      case 'text':
        return <Type size={14} className="layer-icon text" />;
      case 'image':
        return <ImageIcon size={14} className="layer-icon image" />;
    }
  };

  const renderLayerItem = (obj: SceneObject, depth = 0) => {
    const isSelected = selectedIds.includes(obj.id);
    const isHovered = hoveredId === obj.id;
    const isEditing = editingId === obj.id;
    const isContainer = obj.type === 'frame' || obj.type === 'group';
    const isCollapsed = collapsedItems[obj.id];
    const isDragOver = dragOverId === obj.id;

    // Children if frame or group
    const children = objects.filter((o) => o.parentId === obj.id);

    return (
      <div key={obj.id} className="layer-item-wrapper">
        <div
          className={`layer-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${
            isDragOver ? 'drag-over' : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, obj.id)}
          onDragOver={(e) => handleDragOver(e, obj.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, obj)}
          onClick={(e) => select(obj.id, e.shiftKey || e.ctrlKey || e.metaKey)}
          onMouseEnter={() => setHovered(obj.id)}
          onMouseLeave={() => setHovered(null)}
          onDoubleClick={(e) => handleStartRename(obj, e)}
        >
          {/* Collapse Arrow for Frames / Groups */}
          {isContainer && children.length > 0 ? (
            <span
              className="layer-collapse-toggle"
              onClick={(e) => toggleCollapse(obj.id, e)}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </span>
          ) : (
            <span className="layer-collapse-spacer" />
          )}

          {/* Object Type Icon */}
          <span className="layer-type-icon">{getObjectIcon(obj)}</span>

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

        {/* Render Nested Children */}
        {isContainer && !isCollapsed && children.length > 0 && (
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
        <div className="flex items-center gap-1">
          {selectedIds.length >= 2 && (
            <IconButton
              icon={<Group size={13} />}
              size="sm"
              tooltip="Group Selection (Ctrl+G)"
              onClick={handleGroupSelected}
            />
          )}
          {selectedIds.some((id) => objects.find((o) => o.id === id)?.type === 'group') && (
            <IconButton
              icon={<Ungroup size={13} />}
              size="sm"
              tooltip="Ungroup Selection (Ctrl+Shift+G)"
              onClick={handleUngroupSelected}
            />
          )}
          {selectedIds.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Layers List */}
      <div
        className="layers-list-scroll"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedId) {
            reparentObject(draggedId, null);
            setDraggedId(null);
            setDragOverId(null);
          }
        }}
      >
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
