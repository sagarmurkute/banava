import { useEffect } from 'react';
import { useToolStore } from '../state/useToolStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useUIStore } from '../state/useUIStore';

export function useKeyboardShortcuts() {
  const { setActiveTool, setIsSpacePressed } = useToolStore();
  const { undo, redo, deleteObjects, save, getActivePage } = useDocumentStore();
  const { selectedIds, deselectAll, selectMultiple } = useSelectionStore();
  const { setStatusMessage } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) {
        // Allow escape to blur input
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Space bar for panning
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
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
        setStatusMessage('Document saved to local storage.');
        return;
      }

      // Select All
      if (isCtrlOrMeta && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const page = getActivePage();
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

      // Escape -> Deselect
      if (e.key === 'Escape') {
        deselectAll();
        setActiveTool('select');
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
    setStatusMessage,
  ]);
}
