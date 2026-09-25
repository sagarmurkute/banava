import React, { useState } from 'react';
import { Plus, FileText, Trash2, Check, Edit2 } from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { IconButton } from '../components/ui/IconButton';
import './pages.css';

export const PagesPanel: React.FC = () => {
  const { doc, setActivePage, addPage, renamePage, deletePage } = useDocumentStore();
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(id);
    setEditingName(currentName);
  };

  const handleCommitRename = (id: string) => {
    if (editingName.trim()) {
      renamePage(id, editingName);
    }
    setEditingPageId(null);
  };

  const handleAddPage = () => {
    const newId = addPage();
    setEditingPageId(newId);
    setEditingName(`Page ${doc.pages.length + 1}`);
  };

  return (
    <div className="pages-panel-container">
      <div className="pages-panel-toolbar">
        <span className="pages-header-title">Pages ({doc.pages.length})</span>
        <IconButton
          icon={<Plus size={14} />}
          size="sm"
          tooltip="Add new page"
          onClick={handleAddPage}
        />
      </div>

      <div className="pages-list-scroll">
        {doc.pages.map((page) => {
          const isActive = page.id === doc.activePageId;
          const isEditing = editingPageId === page.id;

          return (
            <div
              key={page.id}
              className={`page-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(page.id)}
              onDoubleClick={(e) => handleStartRename(page.id, page.name, e)}
            >
              <FileText size={14} className="page-icon" />

              <div className="page-name-container">
                {isEditing ? (
                  <input
                    type="text"
                    autoFocus
                    className="page-name-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleCommitRename(page.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename(page.id);
                      if (e.key === 'Escape') setEditingPageId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="page-name-label truncate">{page.name}</span>
                )}
              </div>

              <span className="page-object-count">
                {page.objects.length} {page.objects.length === 1 ? 'obj' : 'objs'}
              </span>

              <div className="page-actions">
                {isEditing ? (
                  <button
                    className="page-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCommitRename(page.id);
                    }}
                  >
                    <Check size={12} />
                  </button>
                ) : (
                  <button
                    className="page-action-btn"
                    title="Rename page"
                    onClick={(e) => handleStartRename(page.id, page.name, e)}
                  >
                    <Edit2 size={12} />
                  </button>
                )}

                {doc.pages.length > 1 && (
                  <button
                    className="page-action-btn danger"
                    title="Delete page"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(page.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
