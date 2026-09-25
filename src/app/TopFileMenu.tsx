import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Plus,
  Save,
  Copy,
  Download,
  Info,
  History,
  Grid,
  Upload,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';
import { ExportEngine } from '../export/exportEngine';
import { ImportEngine } from '../import/importEngine';
import { defaultStorageProvider } from '../storage/storageProvider';

export const TopFileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { doc, createNewDocument, duplicateCurrentDocument, save } = useDocumentStore();
  const { setViewMode, setActiveModal, setStatusMessage } = useUIStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNew = () => {
    setIsOpen(false);
    createNewDocument('Untitled Design');
    setStatusMessage('Created new document');
  };

  const handleOpenDashboard = () => {
    setIsOpen(false);
    setViewMode('dashboard');
  };

  const handleSave = () => {
    setIsOpen(false);
    save();
    setStatusMessage('Saved document');
  };

  const handleDuplicate = () => {
    setIsOpen(false);
    const duplicated = duplicateCurrentDocument();
    setStatusMessage(`Duplicated as "${duplicated.name}"`);
  };

  const handleExportBanava = () => {
    setIsOpen(false);
    ExportEngine.exportDocumentBanava(doc);
    setStatusMessage('Exported .banava document');
  };

  const handleExportPdf = () => {
    setIsOpen(false);
    ExportEngine.exportDocumentPdf(doc);
    setStatusMessage('Exported PDF document');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(false);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const result = await ImportEngine.importBanavaFile(file);
      if (result.valid && result.document) {
        await defaultStorageProvider.saveDocument(result.document);
        useDocumentStore.getState().openDocument(result.document);
        setStatusMessage(`Imported ${file.name}`);
      } else {
        alert(`Failed to import file: ${result.errors.join(', ')}`);
      }
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-200 rounded transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>File</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-surface-100 border border-border-default rounded-lg shadow-2xl py-1 z-50 text-xs text-text-primary animate-in fade-in zoom-in-95 duration-100">
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={handleNew}
          >
            <div className="flex items-center gap-2">
              <Plus size={13} />
              <span>New Document</span>
            </div>
            <span className="text-[10px] text-text-muted">Ctrl+N</span>
          </button>

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={handleOpenDashboard}
          >
            <div className="flex items-center gap-2">
              <Grid size={13} />
              <span>All Documents (Dashboard)</span>
            </div>
            <span className="text-[10px] text-text-muted">Ctrl+O</span>
          </button>

          <label className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left cursor-pointer">
            <div className="flex items-center gap-2">
              <Upload size={13} />
              <span>Import .banava...</span>
            </div>
            <input
              type="file"
              accept=".banava,.json"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
          </label>

          <div className="my-1 border-t border-border-subtle" />

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={handleSave}
          >
            <div className="flex items-center gap-2">
              <Save size={13} />
              <span>Save Document</span>
            </div>
            <span className="text-[10px] text-text-muted">Ctrl+S</span>
          </button>

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={handleDuplicate}
          >
            <div className="flex items-center gap-2">
              <Copy size={13} />
              <span>Duplicate Document</span>
            </div>
            <span className="text-[10px] text-text-muted">Ctrl+Shift+D</span>
          </button>

          <div className="my-1 border-t border-border-subtle" />

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={handleExportBanava}
          >
            <div className="flex items-center gap-2">
              <Download size={13} />
              <span>Export .banava File</span>
            </div>
            <span className="text-[10px] text-text-muted">Ctrl+Shift+E</span>
          </button>

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={handleExportPdf}
          >
            <div className="flex items-center gap-2">
              <FileText size={13} />
              <span>Export Document as PDF</span>
            </div>
          </button>

          <div className="my-1 border-t border-border-subtle" />

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={() => {
              setIsOpen(false);
              setActiveModal('snapshots');
            }}
          >
            <div className="flex items-center gap-2">
              <History size={13} />
              <span>Version Snapshots</span>
            </div>
          </button>

          <button
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-surface-200 text-left"
            onClick={() => {
              setIsOpen(false);
              setActiveModal('documentInfo');
            }}
          >
            <div className="flex items-center gap-2">
              <Info size={13} />
              <span>Document Information</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
