import { useEffect } from 'react';
import { useToolStore } from '../state/useToolStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useViewportStore } from '../state/useViewportStore';
import { useUIStore } from '../state/useUIStore';
import { useClipboardStore } from '../state/useClipboardStore';
import type { SceneObject } from '../types/document';

export function useKeyboardShortcuts() {
  const { setActiveTool, setIsSpacePressed } = useToolStore();
  const { undo, redo, deleteObjects, save, getActivePage, duplicateObjects, updateObjects, commitHistory } = useDocumentStore();
  const { selectedIds, deselectAll, selectMultiple, select } = useSelectionStore();
  const { zoomIn, zoomOut, resetZoom, fitToScreen } = useViewportStore();
  const { setStatusMessage } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea or contenteditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const page = getActivePage();
      const objects = page?.objects || [];

      // Space bar for panning
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Clipboard actions: Cut (Ctrl+X), Copy (Ctrl+C), Paste (Ctrl+V)
      if (isCtrlOrMeta && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        const selectedObjs = objects.filter((o) => selectedIds.includes(o.id));
        useClipboardStore.getState().copy(selectedObjs);
        return;
      }

      if (isCtrlOrMeta && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        const selectedObjs = objects.filter((o) => selectedIds.includes(o.id));
        useClipboardStore.getState().cut(selectedObjs);
        return;
      }

      if (isCtrlOrMeta && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        useClipboardStore.getState().paste();
        return;
      }
      if (isCtrlOrMeta && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          const newIds = duplicateObjects(selectedIds, { x: 20, y: 20 });
          selectMultiple(newIds);
          setStatusMessage(`Duplicated ${newIds.length} object(s)`);
        }
        return;
      }

      // Create Component Shortcut (Ctrl/Cmd + Alt + K)
      if (isCtrlOrMeta && e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (selectedIds.length === 1) {
          const compId = useDocumentStore.getState().createComponent(selectedIds[0]);
          if (compId) {
            setStatusMessage('Created Master Component (Ctrl+Alt+K)');
          }
        }
        return;
      }

      // Group / Ungroup (Ctrl/Cmd + G, Ctrl/Cmd + Shift + G)
      if (isCtrlOrMeta && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (e.shiftKey) {
          const selectedGroups = objects.filter((o) => selectedIds.includes(o.id) && (o.type === 'group' || o.type === 'frame'));
          const released = useDocumentStore.getState().ungroupObjects(selectedGroups.map((g) => g.id));
          if (released.length > 0) {
            selectMultiple(released);
            setStatusMessage('Ungrouped objects');
          }
        } else if (selectedIds.length >= 2) {
          const groupId = useDocumentStore.getState().groupObjects(selectedIds);
          if (groupId) {
            select(groupId);
            setStatusMessage('Grouped objects');
          }
        }
        return;
      }

      // Zoom Shortcuts
      if (isCtrlOrMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (isCtrlOrMeta && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (isCtrlOrMeta && e.key === '0') {
        e.preventDefault();
        resetZoom();
        setStatusMessage('Zoom reset to 100%');
        return;
      }
      if (isCtrlOrMeta && e.key === '1') {
        e.preventDefault();
        const w = window.innerWidth - 260 - 280;
        const h = window.innerHeight - 48 - 32;
        fitToScreen(objects, w, h);
        setStatusMessage('Fit to screen');
        return;
      }

      // Undo / Redo
      if (isCtrlOrMeta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
          setStatusMessage('Redo');
        } else {
          undo();
          setStatusMessage('Undo');
        }
        return;
      }

      if (isCtrlOrMeta && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        setStatusMessage('Redo');
        return;
      }

      // Save
      if (isCtrlOrMeta && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        save();
        setStatusMessage('Document saved');
        return;
      }

      // Select All
      if (isCtrlOrMeta && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (page) {
          const selectableIds = page.objects.filter((o) => o.visible && !o.locked).map((o) => o.id);
          selectMultiple(selectableIds);
          setStatusMessage(`Selected ${selectableIds.length} objects`);
        }
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteObjects(selectedIds);
          deselectAll();
          setStatusMessage('Deleted selected object(s)');
        }
        return;
      }

      // Enter -> Drill down into frame children
      if (e.key === 'Enter' && selectedIds.length === 1) {
        const selObj = objects.find((o) => o.id === selectedIds[0]);
        if (selObj && (selObj.type === 'frame' || selObj.type === 'group')) {
          const children = objects.filter((o) => o.parentId === selObj.id && o.visible && !o.locked);
          if (children.length > 0) {
            e.preventDefault();
            selectMultiple(children.map((c) => c.id));
            setStatusMessage(`Selected ${children.length} children inside ${selObj.name}`);
            return;
          }
        }
      }

      // Escape -> Move selection to parent frame or deselect
      if (e.key === 'Escape') {
        if (selectedIds.length === 1) {
          const selObj = objects.find((o) => o.id === selectedIds[0]);
          if (selObj && selObj.parentId) {
            e.preventDefault();
            select(selObj.parentId);
            const parentObj = objects.find((o) => o.id === selObj.parentId);
            setStatusMessage(`Selected parent ${parentObj?.name || 'frame'}`);
            return;
          }
        }
        deselectAll();
        setActiveTool('select');
        return;
      }

      // Precision Arrow Keys Movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;

        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const updates: Record<string, Partial<SceneObject>> = {};
        for (const id of selectedIds) {
          const obj = objects.find((o) => o.id === id);
          if (obj && !obj.locked) {
            updates[id] = { x: obj.x + dx, y: obj.y + dy };
          }
        }
        if (Object.keys(updates).length > 0) {
          updateObjects(updates, false);
          commitHistory();
        }
        return;
      }

      // Single key tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'f':
          setActiveTool('frame');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'o':
          setActiveTool('ellipse');
          break;
        case 'p':
          setActiveTool('polygon');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 't':
          setActiveTool('text');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    setActiveTool,
    setIsSpacePressed,
    undo,
    redo,
    deleteObjects,
    save,
    getActivePage,
    selectedIds,
    deselectAll,
    selectMultiple,
    select,
    duplicateObjects,
    updateObjects,
    commitHistory,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    setStatusMessage,
  ]);
}
