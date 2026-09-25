import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Layout,
  Trash2,
  Plus,
  Search,
  Upload,
  Layers,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';
import { defaultStorageProvider } from '../storage/storageProvider';
import { DocumentService } from '../documents/documentEngine';
import { ImportEngine } from '../import/importEngine';
import { ExportEngine } from '../export/exportEngine';
import { DocumentCard } from './DocumentCard';
import { ProjectTree } from './ProjectTree';
import type { DocumentSummary, BanavaProject, BanavaFolder } from '../documents/types';
import './dashboard.css';

export const DocumentDashboard: React.FC = () => {
  const { doc, openDocument, createNewDocument, renameDocument } = useDocumentStore();
  const {
    dashboardTab,
    setDashboardTab,
    selectedProjectId,
    setSelectedProjectId,
    selectedFolderId,
    setSelectedFolderId,
    searchQuery,
    setSearchQuery,
    setViewMode,
    setStatusMessage,
  } = useUIStore();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [projects, setProjects] = useState<BanavaProject[]>([]);
  const [folders, setFolders] = useState<BanavaFolder[]>([]);

  // Load documents and projects on mount / tab change
  const refreshData = async () => {
    const [docs, projs, flds] = await Promise.all([
      defaultStorageProvider.listDocuments(),
      defaultStorageProvider.listProjects(),
      defaultStorageProvider.listFolders(),
    ]);

    // If no documents exist in storage, add active doc summary
    if (docs.length === 0 && doc) {
      await defaultStorageProvider.saveDocument(doc);
      const reDocs = await defaultStorageProvider.listDocuments();
      setDocuments(reDocs);
    } else {
      setDocuments(docs);
    }

    setProjects(projs);
    setFolders(flds);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filter documents based on active tab and selection
  const filteredDocuments = useMemo(() => {
    let list = documents;

    // Search query
    if (searchQuery.trim()) {
      list = DocumentService.searchDocuments(list, projects, folders, searchQuery);
    }

    if (dashboardTab === 'trash') {
      return list.filter((d) => d.deletedAt !== null);
    }

    // Exclude trashed docs for all other views
    list = list.filter((d) => d.deletedAt === null);

    if (dashboardTab === 'recent') {
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    if (selectedProjectId) {
      list = list.filter((d) => d.projectId === selectedProjectId);
      if (selectedFolderId) {
        list = list.filter((d) => d.folderId === selectedFolderId);
      }
      return list;
    }

    return list;
  }, [documents, dashboardTab, selectedProjectId, selectedFolderId, searchQuery, projects, folders]);

  // Actions
  const handleOpenDoc = async (summary: DocumentSummary) => {
    const fullDoc = await defaultStorageProvider.getDocument(summary.id);
    if (fullDoc) {
      openDocument(fullDoc);
      setViewMode('editor');
      setStatusMessage(`Opened ${fullDoc.name}`);
    } else {
      alert('Could not find document data in storage.');
    }
  };

  const handleCreateNew = () => {
    createNewDocument('Untitled Design', selectedProjectId, selectedFolderId);
    setViewMode('editor');
  };

  const handleRename = async (summary: DocumentSummary) => {
    const newName = window.prompt('Rename document:', summary.name);
    if (!newName || newName.trim() === summary.name) return;

    const targetDoc = await defaultStorageProvider.getDocument(summary.id);
    if (targetDoc) {
      const renamed = DocumentService.renameDocument(targetDoc, newName.trim());
      await defaultStorageProvider.saveDocument(renamed);
      if (doc.id === summary.id) {
        renameDocument(newName.trim());
      }
      refreshData();
    }
  };

  const handleDuplicate = async (summary: DocumentSummary) => {
    const targetDoc = await defaultStorageProvider.getDocument(summary.id);
    if (targetDoc) {
      const duplicated = DocumentService.duplicateDocument(targetDoc);
      await defaultStorageProvider.saveDocument(duplicated);
      refreshData();
      setStatusMessage(`Duplicated "${summary.name}"`);
    }
  };

  const handleMoveToProject = async (summary: DocumentSummary) => {
    const options = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const pick = window.prompt(`Choose project number:\n0. None\n${options}`, '1');
    if (pick === null) return;

    let targetProjectId: string | null = null;
    const num = parseInt(pick, 10);
    if (num > 0 && num <= projects.length) {
      targetProjectId = projects[num - 1].id;
    }

    const targetDoc = await defaultStorageProvider.getDocument(summary.id);
    if (targetDoc) {
      const moved = DocumentService.moveDocument(targetDoc, targetProjectId, null);
      await defaultStorageProvider.saveDocument(moved);
      refreshData();
      setStatusMessage('Document moved');
    }
  };

  const handleExportBanava = async (summary: DocumentSummary) => {
    const targetDoc = await defaultStorageProvider.getDocument(summary.id);
    if (targetDoc) {
      ExportEngine.exportDocumentBanava(targetDoc);
    }
  };

  const handleDelete = async (summary: DocumentSummary, permanent = false) => {
    if (permanent) {
      if (!confirm(`Permanently delete "${summary.name}"? This cannot be undone.`)) return;
    }
    await defaultStorageProvider.deleteDocument(summary.id, permanent);
    refreshData();
    setStatusMessage(permanent ? 'Permanently deleted' : 'Moved to trash');
  };

  const handleRestore = async (summary: DocumentSummary) => {
    await defaultStorageProvider.restoreDocument(summary.id);
    refreshData();
    setStatusMessage(`Restored "${summary.name}"`);
  };

  const handleEmptyTrash = async () => {
    if (confirm('Empty trash? All trashed documents will be permanently deleted.')) {
      await defaultStorageProvider.emptyTrash();
      refreshData();
      setStatusMessage('Trash emptied');
    }
  };

  // Drag & Drop Import
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.banava') || file.name.endsWith('.json')) {
        const result = await ImportEngine.importBanavaFile(file);
        if (result.valid && result.document) {
          await defaultStorageProvider.saveDocument(result.document);
          openDocument(result.document);
          setViewMode('editor');
          setStatusMessage(`Imported ${file.name}`);
        } else {
          alert(`Failed to import file: ${result.errors.join(', ')}`);
        }
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const result = await ImportEngine.importBanavaFile(file);
      if (result.valid && result.document) {
        await defaultStorageProvider.saveDocument(result.document);
        openDocument(result.document);
        setViewMode('editor');
        setStatusMessage(`Imported ${file.name}`);
      } else {
        alert(`Failed to import file: ${result.errors.join(', ')}`);
      }
    }
  };

  return (
    <div
      className="banava-dashboard"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand" onClick={() => setViewMode('editor')}>
          <div className="dashboard-brand-logo">B</div>
          <span className="dashboard-brand-name">BANAVA</span>
        </div>

        <nav className="dashboard-nav">
          <button
            className={`dashboard-nav-item ${dashboardTab === 'recent' && !selectedProjectId ? 'active' : ''}`}
            onClick={() => {
              setDashboardTab('recent');
              setSelectedProjectId(null);
              setSelectedFolderId(null);
            }}
          >
            <Clock size={16} />
            <span>Recent</span>
          </button>

          <button
            className={`dashboard-nav-item ${dashboardTab === 'templates' ? 'active' : ''}`}
            onClick={() => {
              setDashboardTab('templates');
              setSelectedProjectId(null);
              setSelectedFolderId(null);
            }}
          >
            <Layout size={16} />
            <span>Templates</span>
          </button>

          <button
            className={`dashboard-nav-item ${dashboardTab === 'trash' ? 'active' : ''}`}
            onClick={() => {
              setDashboardTab('trash');
              setSelectedProjectId(null);
              setSelectedFolderId(null);
            }}
          >
            <Trash2 size={16} />
            <span>Trash</span>
          </button>
        </nav>

        {/* Projects & Folders Tree */}
        <ProjectTree
          projects={projects}
          folders={folders}
          selectedProjectId={selectedProjectId}
          selectedFolderId={selectedFolderId}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setDashboardTab('projects');
          }}
          onSelectFolder={(id) => setSelectedFolderId(id)}
          onSaveProject={async (p) => {
            await defaultStorageProvider.saveProject(p);
            refreshData();
          }}
          onDeleteProject={async (id) => {
            await defaultStorageProvider.deleteProject(id);
            if (selectedProjectId === id) setSelectedProjectId(null);
            refreshData();
          }}
          onSaveFolder={async (f) => {
            await defaultStorageProvider.saveFolder(f);
            refreshData();
          }}
          onDeleteFolder={async (id) => {
            await defaultStorageProvider.deleteFolder(id);
            if (selectedFolderId === id) setSelectedFolderId(null);
            refreshData();
          }}
        />
      </aside>

      {/* Main Area */}
      <main className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="dashboard-search-box">
            <Search size={15} />
            <input
              type="text"
              className="dashboard-search-input"
              placeholder="Search designs, projects, folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dashboard-top-actions">
            <label className="btn-import-doc" title="Import .banava file">
              <Upload size={14} />
              <span>Import</span>
              <input
                type="file"
                accept=".banava,.json"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
            </label>

            <button className="btn-new-doc" onClick={handleCreateNew}>
              <Plus size={16} />
              <span>New Design</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content-area">
          <div className="dashboard-header-row">
            <h1 className="dashboard-page-title">
              {dashboardTab === 'trash'
                ? 'Trash'
                : dashboardTab === 'templates'
                ? 'Design Templates'
                : selectedProjectId
                ? projects.find((p) => p.id === selectedProjectId)?.name || 'Project'
                : 'Recent Designs'}
            </h1>

            {dashboardTab === 'trash' && filteredDocuments.length > 0 && (
              <button className="btn-import-doc danger" onClick={handleEmptyTrash}>
                <Trash2 size={13} />
                <span>Empty Trash</span>
              </button>
            )}
          </div>

          {/* Templates Section */}
          {dashboardTab === 'templates' && (
            <div className="documents-grid" style={{ marginBottom: '32px' }}>
              <div
                className="doc-card"
                onClick={() => {
                  createNewDocument('Landing Page Wireframe');
                  setViewMode('editor');
                }}
              >
                <div className="doc-card-preview" style={{ background: '#1e1b4b' }}>
                  <Monitor size={40} className="text-indigo-400" />
                </div>
                <div className="doc-card-info">
                  <span className="doc-card-title">Desktop Landing Wireframe</span>
                  <span className="doc-card-meta">1440 × 900 • Auto Layout Ready</span>
                </div>
              </div>

              <div
                className="doc-card"
                onClick={() => {
                  createNewDocument('Mobile UI Kit');
                  setViewMode('editor');
                }}
              >
                <div className="doc-card-preview" style={{ background: '#4a044e' }}>
                  <Smartphone size={40} className="text-pink-400" />
                </div>
                <div className="doc-card-info">
                  <span className="doc-card-title">Mobile App Screens</span>
                  <span className="doc-card-meta">390 × 844 • iOS 15 Components</span>
                </div>
              </div>
            </div>
          )}

          {/* Documents Grid */}
          {filteredDocuments.length > 0 ? (
            <div className="documents-grid">
              {filteredDocuments.map((d) => (
                <DocumentCard
                  key={d.id}
                  doc={d}
                  isTrash={dashboardTab === 'trash'}
                  projectName={projects.find((p) => p.id === d.projectId)?.name}
                  onOpen={() => handleOpenDoc(d)}
                  onRename={() => handleRename(d)}
                  onDuplicate={() => handleDuplicate(d)}
                  onMoveToProject={() => handleMoveToProject(d)}
                  onExport={() => handleExportBanava(d)}
                  onDelete={() => handleDelete(d, dashboardTab === 'trash')}
                  onRestore={() => handleRestore(d)}
                />
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-icon">
                <Layers size={24} />
              </div>
              <h3 style={{ fontSize: '15px', color: '#f3f4f6', margin: 0 }}>
                {dashboardTab === 'trash' ? 'Trash is Empty' : 'No Documents Found'}
              </h3>
              <p style={{ fontSize: '12px', margin: 0 }}>
                {dashboardTab === 'trash'
                  ? 'Deleted designs will appear here.'
                  : 'Create a new design or drag a .banava file to get started.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
