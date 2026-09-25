import React, { useState } from 'react';
import { X, History, Plus, RotateCcw, Trash2, Edit2, Check } from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';

export const SnapshotsModal: React.FC = () => {
  const { doc, createSnapshot, restoreSnapshot, deleteSnapshot, renameSnapshot } = useDocumentStore();
  const { activeModal, setActiveModal, setStatusMessage } = useUIStore();

  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (activeModal !== 'snapshots') return null;

  const snapshots = doc.snapshots || [];

  const handleCreate = () => {
    const name = newSnapshotName.trim() || `Snapshot ${new Date().toLocaleTimeString()}`;
    createSnapshot(name);
    setNewSnapshotName('');
    setStatusMessage(`Created snapshot "${name}"`);
  };

  const handleRestore = (id: string, name: string) => {
    if (confirm(`Restore document to snapshot "${name}"? Unsaved changes will be replaced.`)) {
      restoreSnapshot(id);
      setActiveModal('none');
      setStatusMessage(`Restored to snapshot "${name}"`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete snapshot "${name}"?`)) {
      deleteSnapshot(id);
      setStatusMessage('Snapshot deleted');
    }
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameSnapshot(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-100 border border-border-default rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <History size={16} className="text-brand" />
            <h2 className="text-sm font-semibold">Version Snapshots</h2>
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
          {/* Create new snapshot input */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-1.5 rounded-lg bg-surface-200 border border-border-default focus:border-brand outline-none text-text-primary placeholder:text-text-muted"
              placeholder="Enter snapshot name (e.g. v1.0 Final Layout)..."
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-medium flex items-center gap-1.5"
              onClick={handleCreate}
            >
              <Plus size={13} />
              <span>Create</span>
            </button>
          </div>

          {/* Snapshots List */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {snapshots.length > 0 ? (
              snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-200/40 border border-border-subtle hover:border-border-default transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    {editingId === snap.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          className="px-2 py-0.5 rounded bg-surface-300 border border-border-default text-xs text-text-primary outline-none"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(snap.id)}
                        />
                        <button
                          className="p-1 text-emerald-400 hover:bg-surface-300 rounded"
                          onClick={() => handleSaveRename(snap.id)}
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="font-semibold text-text-primary truncate">{snap.name}</div>
                    )}
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {new Date(snap.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="px-2.5 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 text-indigo-300 font-medium flex items-center gap-1 text-[11px]"
                      title="Restore document to this snapshot"
                      onClick={() => handleRestore(snap.id, snap.name)}
                    >
                      <RotateCcw size={11} />
                      <span>Restore</span>
                    </button>
                    <button
                      className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-300"
                      title="Rename snapshot"
                      onClick={() => {
                        setEditingId(snap.id);
                        setEditingName(snap.name);
                      }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-surface-300"
                      title="Delete snapshot"
                      onClick={() => handleDelete(snap.id, snap.name)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted">
                <History size={24} className="mx-auto mb-2 opacity-50" />
                <p>No snapshots yet. Create one to bookmark your work.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle bg-surface-200/30 flex justify-end">
          <button
            className="px-4 py-1.5 rounded-lg bg-surface-300 text-text-primary font-medium hover:bg-surface-200 text-xs"
            onClick={() => setActiveModal('none')}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
