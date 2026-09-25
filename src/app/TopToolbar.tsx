import React, { useState } from 'react';
import {
  MousePointer,
  Frame,
  Square,
  Circle,
  Minus,
  Type,
  Undo2,
  Redo2,
  Save,
  Grid,
  Magnet,
  Maximize,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useToolStore } from '../state/useToolStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useViewportStore } from '../state/useViewportStore';
import { useUIStore } from '../state/useUIStore';
import type { ToolType } from '../types/document';
import { IconButton } from '../components/ui/IconButton';
import './app.css';

export const TopToolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useToolStore();
  const { doc, undo, redo, canUndo, canRedo, save, getActivePage } = useDocumentStore();
  const { zoom, fitToScreen, resetZoom } = useViewportStore();
  const { showGrid, toggleGrid, snapToGrid, toggleSnapToGrid, setStatusMessage } = useUIStore();

  const [isEditingDocName, setIsEditingDocName] = useState(false);
  const [docName, setDocName] = useState(doc.name);

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  const tools: { type: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { type: 'select', label: 'Select Tool', icon: <MousePointer size={16} />, shortcut: 'V' },
    { type: 'frame', label: 'Frame Tool', icon: <Frame size={16} />, shortcut: 'F' },
    { type: 'rectangle', label: 'Rectangle Tool', icon: <Square size={16} />, shortcut: 'R' },
    { type: 'ellipse', label: 'Ellipse Tool', icon: <Circle size={16} />, shortcut: 'O' },
    { type: 'line', label: 'Line Tool', icon: <Minus size={16} />, shortcut: 'L' },
    { type: 'text', label: 'Text Tool', icon: <Type size={16} />, shortcut: 'T' },
  ];

  const handleSave = () => {
    save();
    setStatusMessage('Document saved to local storage.');
  };

  const handleFitScreen = () => {
    const w = window.innerWidth - 260 - 280;
    const h = window.innerHeight - 48 - 32;
    fitToScreen(objects, w, h);
  };

  return (
    <header className="app-top-toolbar">
      {/* Brand Logo & Name */}
      <div className="toolbar-brand-section">
        <div className="brand-logo-badge">
          <Sparkles size={16} className="brand-logo-icon" />
        </div>
        <span className="brand-name">Sagar Design</span>
        <div className="brand-badge-phase">v1.0</div>
      </div>

      {/* Document Name */}
      <div className="toolbar-doc-title-container">
        {isEditingDocName ? (
          <input
            type="text"
            autoFocus
            className="doc-title-input"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            onBlur={() => {
              useDocumentStore.setState((s) => ({ doc: { ...s.doc, name: docName } }));
              setIsEditingDocName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                useDocumentStore.setState((s) => ({ doc: { ...s.doc, name: docName } }));
                setIsEditingDocName(false);
              }
            }}
          />
        ) : (
          <span
            className="doc-title-label truncate"
            title="Click to rename document"
            onClick={() => setIsEditingDocName(true)}
          >
            {doc.name}
          </span>
        )}
      </div>

      {/* Center Tool Selector */}
      <div className="toolbar-tools-group">
        {tools.map((t) => (
          <IconButton
            key={t.type}
            icon={t.icon}
            isActive={activeTool === t.type}
            tooltip={t.label}
            shortcut={t.shortcut}
            onClick={() => setActiveTool(t.type)}
          />
        ))}
      </div>

      {/* Right Toolbar Actions */}
      <div className="toolbar-actions-group">
        <div className="toolbar-btn-divider" />

        {/* Undo / Redo */}
        <IconButton
          icon={<Undo2 size={16} />}
          tooltip="Undo"
          shortcut="Ctrl+Z"
          disabled={!canUndo()}
          onClick={undo}
        />
        <IconButton
          icon={<Redo2 size={16} />}
          tooltip="Redo"
          shortcut="Ctrl+Shift+Z"
          disabled={!canRedo()}
          onClick={redo}
        />

        <div className="toolbar-btn-divider" />

        {/* View Options */}
        <IconButton
          icon={<Grid size={16} />}
          isActive={showGrid}
          tooltip="Toggle Canvas Grid"
          onClick={toggleGrid}
        />
        <IconButton
          icon={<Magnet size={16} />}
          isActive={snapToGrid}
          tooltip="Toggle Snap to Grid"
          onClick={toggleSnapToGrid}
        />
        <IconButton
          icon={<Maximize size={16} />}
          tooltip="Fit to Screen"
          onClick={handleFitScreen}
        />
        <IconButton
          icon={<RotateCcw size={16} />}
          tooltip="Reset Zoom (100%)"
          onClick={() => resetZoom()}
        />

        <div className="toolbar-btn-divider" />

        {/* Zoom Indicator */}
        <span className="toolbar-zoom-indicator">
          {Math.round(zoom * 100)}%
        </span>

        {/* Save Button */}
        <button className="toolbar-save-btn" onClick={handleSave} title="Save to local storage (Ctrl+S)">
          <Save size={14} />
          <span>Save</span>
        </button>
      </div>
    </header>
  );
};
