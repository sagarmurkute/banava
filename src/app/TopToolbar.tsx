import React, { useState } from 'react';
import {
  MousePointer,
  Frame,
  Square,
  Circle,
  Triangle,
  Minus,
  Type,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Save,
  Grid,
  Magnet,
  Ruler,
  Maximize,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { useToolStore } from '../state/useToolStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useViewportStore } from '../state/useViewportStore';
import { useUIStore } from '../state/useUIStore';
import { processImageFile } from '../utils/imageImporter';
import type { ToolType } from '../types/document';
import { IconButton } from '../components/ui/IconButton';
import { TopFileMenu } from './TopFileMenu';
import { UserAvatarMenu } from '../backend/auth/UserAvatarMenu';
import './app.css';

export const TopToolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useToolStore();
  const { doc, undo, redo, canUndo, canRedo, save, saveStatus, getActivePage } = useDocumentStore();
  const { zoom, fitToScreen, resetZoom } = useViewportStore();
  const {
    showGrid,
    toggleGrid,
    showRulers,
    toggleRulers,
    snapToGrid,
    toggleSnapToGrid,
    setStatusMessage,
    editorMode,
    setEditorMode,
    setIsPresenting,
    setViewMode,
  } = useUIStore();

  const [isEditingDocName, setIsEditingDocName] = useState(false);
  const [docName, setDocName] = useState(doc.name);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const { asset, imageObject } = await processImageFile(file, 200, 200);
      useDocumentStore.getState().addAsset(asset);
      useDocumentStore.getState().addObject(imageObject);
      useSelectionStore.getState().select(imageObject.id);
      setStatusMessage(`Imported image: ${file.name}`);
    } catch (err) {
      console.error('Failed to import image:', err);
      setStatusMessage('Image import failed.');
    }
    e.target.value = '';
  };

  const tools: { type: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { type: 'select', label: 'Select Tool', icon: <MousePointer size={16} />, shortcut: 'V' },
    { type: 'frame', label: 'Frame Tool', icon: <Frame size={16} />, shortcut: 'F' },
    { type: 'rectangle', label: 'Rectangle Tool', icon: <Square size={16} />, shortcut: 'R' },
    { type: 'ellipse', label: 'Ellipse Tool', icon: <Circle size={16} />, shortcut: 'O' },
    { type: 'polygon', label: 'Polygon Tool', icon: <Triangle size={16} />, shortcut: 'P' },
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
      {/* Brand Logo & File Menu */}
      <div className="toolbar-brand-section">
        <div
          className="brand-logo-badge cursor-pointer"
          title="Back to All Documents (Dashboard)"
          onClick={() => setViewMode('dashboard')}
        >
          <Sparkles size={16} className="brand-logo-icon" />
        </div>
        <span
          className="brand-name cursor-pointer"
          title="Back to All Documents (Dashboard)"
          onClick={() => setViewMode('dashboard')}
        >
          BANAVA
        </span>
        <TopFileMenu />
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
              if (docName.trim()) {
                useDocumentStore.getState().renameDocument(docName.trim());
              }
              setIsEditingDocName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (docName.trim()) {
                  useDocumentStore.getState().renameDocument(docName.trim());
                }
                setIsEditingDocName(false);
              }
            }}
          />
        ) : (
          <span
            className="doc-title-label truncate cursor-pointer hover:text-white"
            title="Click to rename document"
            onClick={() => {
              setDocName(doc.name);
              setIsEditingDocName(true);
            }}
          >
            {doc.name}
          </span>
        )}
      </div>

      {/* Center Tool Selector & Mode Switcher */}
      <div className="flex items-center gap-3">
        {/* Design / Prototype Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-200 border border-border-subtle">
          <button
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              editorMode === 'design'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setEditorMode('design')}
          >
            Design
          </button>
          <button
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              editorMode === 'prototype'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setEditorMode('prototype')}
          >
            Prototype
          </button>
        </div>

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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleImageFileChange}
          />
          <IconButton
            icon={<ImageIcon size={16} />}
            tooltip="Import Image"
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      </div>

      {/* Right Toolbar Actions */}
      <div className="toolbar-actions-group">
        {/* Present Button */}
        <button
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
          onClick={() => setIsPresenting(true)}
          title="Present Prototype (Ctrl+Alt+P)"
        >
          <Play size={13} fill="currentColor" />
          <span>Present</span>
        </button>

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

        {/* View Options: Grid, Rulers, Snap */}
        <IconButton
          icon={<Grid size={16} />}
          isActive={showGrid}
          tooltip="Toggle Canvas Grid"
          onClick={toggleGrid}
        />
        <IconButton
          icon={<Ruler size={16} />}
          isActive={showRulers}
          tooltip="Toggle Canvas Rulers"
          onClick={toggleRulers}
        />
        <IconButton
          icon={<Magnet size={16} />}
          isActive={snapToGrid}
          tooltip="Toggle Snap to Grid"
          onClick={toggleSnapToGrid}
        />
        <IconButton
          icon={<Maximize size={16} />}
          tooltip="Fit All to Screen (Ctrl+1)"
          onClick={handleFitScreen}
        />
        <IconButton
          icon={<RotateCcw size={16} />}
          tooltip="Reset Zoom 100% (Ctrl+0)"
          onClick={() => resetZoom()}
        />

        <div className="toolbar-btn-divider" />

        {/* Zoom Indicator */}
        <span className="toolbar-zoom-indicator">
          {Math.round(zoom * 100)}%
        </span>

        {/* Save Status & Button */}
        <div className="toolbar-save-wrapper">
          <span className={`save-status-indicator ${saveStatus}`}>
            {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin text-accent" />}
            {saveStatus === 'saved' && <CheckCircle2 size={12} className="text-success" />}
            {saveStatus === 'error' && <AlertCircle size={12} className="text-danger" />}
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}</span>
          </span>

          <button className="toolbar-save-btn" onClick={handleSave} title="Save now (Ctrl+S)">
            <Save size={14} />
            <span>Save</span>
          </button>
        </div>

        <div className="toolbar-btn-divider" />
        <UserAvatarMenu />
      </div>
    </header>
  );
};
