import React, { useState } from 'react';
import {
  FileText,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Download,
  FolderPlus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { DocumentSummary } from '../documents/types';

interface DocumentCardProps {
  doc: DocumentSummary;
  isTrash?: boolean;
  projectName?: string;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onMoveToProject?: () => void;
  onExport: () => void;
  onDelete: () => void;
  onRestore?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  isTrash = false,
  projectName,
  onOpen,
  onRename,
  onDuplicate,
  onMoveToProject,
  onExport,
  onDelete,
  onRestore,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="doc-card"
      onClick={() => {
        if (!isTrash) onOpen();
      }}
    >
      {/* Thumbnail Preview */}
      <div className="doc-card-preview">
        {doc.thumbnail ? (
          <img src={doc.thumbnail} alt={doc.name} />
        ) : (
          <div className="doc-card-preview-placeholder">
            <FileText size={32} />
            <span style={{ fontSize: '11px' }}>{doc.pageCount} Pages • {doc.objectCount} Objects</span>
          </div>
        )}
      </div>

      {/* Info & Menu */}
      <div className="doc-card-info">
        <div className="doc-card-title-row">
          <span className="doc-card-title" title={doc.name}>
            {doc.name}
          </span>
          <button
            className="doc-card-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((s) => !s);
            }}
          >
            <MoreVertical size={14} />
          </button>
        </div>

        <div className="doc-card-meta">
          <span>{formattedDate}</span>
          {doc.fileSizeBytes && (
            <span>• {(doc.fileSizeBytes / 1024).toFixed(1)} KB</span>
          )}
        </div>

        {projectName && <span className="doc-card-badge">{projectName}</span>}
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div
          className="doc-context-menu"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        >
          {!isTrash ? (
            <>
              <button className="doc-context-item" onClick={onOpen}>
                <Sparkles size={13} />
                <span>Open in Editor</span>
              </button>
              <button className="doc-context-item" onClick={onRename}>
                <Edit2 size={13} />
                <span>Rename</span>
              </button>
              <button className="doc-context-item" onClick={onDuplicate}>
                <Copy size={13} />
                <span>Duplicate</span>
              </button>
              {onMoveToProject && (
                <button className="doc-context-item" onClick={onMoveToProject}>
                  <FolderPlus size={13} />
                  <span>Move to Project...</span>
                </button>
              )}
              <button className="doc-context-item" onClick={onExport}>
                <Download size={13} />
                <span>Export .banava</span>
              </button>
              <button className="doc-context-item danger" onClick={onDelete}>
                <Trash2 size={13} />
                <span>Move to Trash</span>
              </button>
            </>
          ) : (
            <>
              {onRestore && (
                <button className="doc-context-item" onClick={onRestore}>
                  <RotateCcw size={13} />
                  <span>Restore Document</span>
                </button>
              )}
              <button className="doc-context-item danger" onClick={onDelete}>
                <Trash2 size={13} />
                <span>Delete Permanently</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
