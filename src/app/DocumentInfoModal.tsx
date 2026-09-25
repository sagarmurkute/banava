import React from 'react';
import { X, FileText } from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';
import { DocumentService } from '../documents/documentEngine';

export const DocumentInfoModal: React.FC = () => {
  const { doc } = useDocumentStore();
  const { activeModal, setActiveModal } = useUIStore();

  if (activeModal !== 'documentInfo') return null;

  const stats = DocumentService.computeDocumentStats(doc);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-100 border border-border-default rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand" />
            <h2 className="text-sm font-semibold">Document Information</h2>
          </div>
          <button
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-200"
            onClick={() => setActiveModal('none')}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Metadata Overview */}
          <div className="bg-surface-200/50 p-3 rounded-lg border border-border-subtle space-y-1.5">
            <div className="flex justify-between">
              <span className="text-text-muted">Document Name:</span>
              <span className="font-semibold text-text-primary">{doc.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Document ID:</span>
              <span className="font-mono text-[11px] text-text-secondary">{doc.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Schema Version:</span>
              <span className="font-mono text-[11px] text-brand">v{doc.version || 6}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Created:</span>
              <span className="text-text-secondary">{new Date(doc.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Last Modified:</span>
              <span className="text-text-secondary">{new Date(doc.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Counts & Stats */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-lg bg-surface-200/30 border border-border-subtle">
              <span className="text-[11px] text-text-muted block">Pages</span>
              <span className="text-base font-bold text-text-primary">{stats.pageCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-200/30 border border-border-subtle">
              <span className="text-[11px] text-text-muted block">Canvas Objects</span>
              <span className="text-base font-bold text-text-primary">{stats.objectCount}</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-200/30 border border-border-subtle">
              <span className="text-[11px] text-text-muted block">Components & Sets</span>
              <span className="text-base font-bold text-text-primary">
                {stats.componentCount} <span className="text-xs font-normal text-text-muted">({stats.variantCount} variants)</span>
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-200/30 border border-border-subtle">
              <span className="text-[11px] text-text-muted block">Styles & Variables</span>
              <span className="text-base font-bold text-text-primary">
                {stats.styleCount + stats.variableCount}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-200/30 border border-border-subtle">
              <span className="text-[11px] text-text-muted block">Prototype Flows</span>
              <span className="text-base font-bold text-text-primary">
                {stats.prototypeFlowCount} <span className="text-xs font-normal text-text-muted">({stats.prototypeConnectionCount} conns)</span>
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface-200/30 border border-border-subtle">
              <span className="text-[11px] text-text-muted block">Document Size</span>
              <span className="text-base font-bold text-text-primary">
                {(stats.fileSizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle bg-surface-200/30 flex justify-end">
          <button
            className="px-4 py-1.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-hover text-xs"
            onClick={() => setActiveModal('none')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
