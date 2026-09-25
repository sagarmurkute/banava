import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Keyboard, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useViewportStore } from '../state/useViewportStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useUIStore } from '../state/useUIStore';
import { IconButton } from '../components/ui/IconButton';
import './app.css';

export const BottomBar: React.FC = () => {
  const { zoom, zoomIn, zoomOut, resetZoom, fitToScreen, x: vpX, y: vpY } = useViewportStore();
  const { getActivePage } = useDocumentStore();
  const { selectedIds } = useSelectionStore();
  const { statusMessage } = useUIStore();

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  const handleFitScreen = () => {
    const w = window.innerWidth - 260 - 280;
    const h = window.innerHeight - 48 - 32;
    fitToScreen(objects, w, h);
  };

  return (
    <footer className="app-bottom-bar">
      {/* Left status & selection summary */}
      <div className="bottom-bar-left">
        {statusMessage ? (
          <div className="status-msg-pill">
            <CheckCircle2 size={12} className="text-success" />
            <span>{statusMessage}</span>
          </div>
        ) : (
          <div className="selection-status-text">
            {selectedIds.length === 0
              ? `${objects.length} total layers on ${activePage?.name || 'canvas'}`
              : `${selectedIds.length} object${selectedIds.length > 1 ? 's' : ''} selected`}
          </div>
        )}
      </div>

      {/* Center Viewport Offset */}
      <div className="bottom-bar-center">
        <span className="coord-text">Pan: {Math.round(vpX)}, {Math.round(vpY)}</span>
      </div>

      {/* Right Zoom & Shortcut Controls */}
      <div className="bottom-bar-right">
        <IconButton
          icon={<Keyboard size={14} />}
          size="sm"
          tooltip="Keyboard shortcuts"
          onClick={() => setShowShortcutsModal(!showShortcutsModal)}
        />

        <div className="bottom-divider" />

        <IconButton
          icon={<ZoomOut size={14} />}
          size="sm"
          tooltip="Zoom out"
          onClick={zoomOut}
        />

        <span
          className="bottom-zoom-text"
          onClick={() => resetZoom()}
          title="Click to reset zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </span>

        <IconButton
          icon={<ZoomIn size={14} />}
          size="sm"
          tooltip="Zoom in"
          onClick={zoomIn}
        />

        <IconButton
          icon={<Maximize2 size={13} />}
          size="sm"
          tooltip="Fit all objects on screen"
          onClick={handleFitScreen}
        />
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="shortcuts-modal-backdrop"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="shortcuts-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shortcuts-modal-header">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-accent" />
                <span className="shortcuts-modal-title">Keyboard Shortcuts</span>
              </div>
              <button
                className="shortcuts-modal-close"
                onClick={() => setShowShortcutsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="shortcuts-grid">
              <div className="shortcut-row">
                <span className="shortcut-desc">Select Tool</span>
                <kbd>V</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Frame Tool</span>
                <kbd>F</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Rectangle Tool</span>
                <kbd>R</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Ellipse Tool</span>
                <kbd>O</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Line Tool</span>
                <kbd>L</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Text Tool</span>
                <kbd>T</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Pan Canvas</span>
                <kbd>Space + Drag</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Undo</span>
                <kbd>Ctrl / ⌘ + Z</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Redo</span>
                <kbd>Ctrl / ⌘ + Shift + Z</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Select All</span>
                <kbd>Ctrl / ⌘ + A</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Save Document</span>
                <kbd>Ctrl / ⌘ + S</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Delete Selection</span>
                <kbd>Delete / Backspace</kbd>
              </div>
              <div className="shortcut-row">
                <span className="shortcut-desc">Deselect</span>
                <kbd>Escape</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
