import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import type { BanavaProject, BanavaFolder } from '../documents/types';
import { generateId } from '../utils/id';

interface ProjectTreeProps {
  projects: BanavaProject[];
  folders: BanavaFolder[];
  selectedProjectId: string | null;
  selectedFolderId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onSelectFolder: (folderId: string | null) => void;
  onSaveProject: (project: BanavaProject) => void;
  onDeleteProject: (projectId: string) => void;
  onSaveFolder: (folder: BanavaFolder) => void;
  onDeleteFolder: (folderId: string) => void;
}

export const ProjectTree: React.FC<ProjectTreeProps> = ({
  projects,
  folders,
  selectedProjectId,
  selectedFolderId,
  onSelectProject,
  onSelectFolder,
  onSaveProject,
  onDeleteProject,
  onSaveFolder,
  onDeleteFolder,
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    proj_default: true,
    proj_mobile: true,
  });

  const toggleProjectExpand = (projId: string) => {
    setExpandedProjects((prev) => ({ ...prev, [projId]: !prev[projId] }));
  };

  const handleCreateProject = () => {
    const name = window.prompt('Enter new Project name:', 'New Project');
    if (!name) return;
    const project: BanavaProject = {
      id: generateId('proj'),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: '#6366f1',
    };
    onSaveProject(project);
  };

  const handleCreateFolder = (projectId?: string) => {
    const name = window.prompt('Enter new Folder name:', 'New Folder');
    if (!name) return;
    const folder: BanavaFolder = {
      id: generateId('folder'),
      projectId: projectId || null,
      parentId: null,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveFolder(folder);
  };

  return (
    <div className="project-tree-container">
      <div className="dashboard-section-title">
        <span>Projects & Folders</span>
        <button
          className="doc-card-menu-btn"
          title="Create New Project"
          onClick={handleCreateProject}
        >
          <Plus size={13} />
        </button>
      </div>

      {projects.map((project) => {
        const isExpanded = expandedProjects[project.id] ?? false;
        const projectFolders = folders.filter((f) => f.projectId === project.id);
        const isSelected = selectedProjectId === project.id && !selectedFolderId;

        return (
          <div key={project.id}>
            <div
              className={`project-tree-item ${isSelected ? 'active' : ''}`}
              onClick={() => {
                onSelectProject(project.id);
                onSelectFolder(null);
              }}
            >
              <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '6px' }}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleProjectExpand(project.id);
                  }}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: project.color || '#6366f1',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontWeight: isSelected ? 600 : 400 }}>{project.name}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  className="doc-card-menu-btn"
                  title="Add Folder to Project"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateFolder(project.id);
                  }}
                >
                  <FolderPlus size={11} />
                </button>
                <button
                  className="doc-card-menu-btn"
                  title="Delete Project"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete project "${project.name}"?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Folders in Project */}
            {isExpanded &&
              projectFolders.map((folder) => {
                const isFolderSelected = selectedFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    className={`folder-tree-item ${isFolderSelected ? 'active' : ''}`}
                    onClick={() => {
                      onSelectProject(project.id);
                      onSelectFolder(folder.id);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Folder size={12} />
                      <span>{folder.name}</span>
                    </div>

                    <button
                      className="doc-card-menu-btn"
                      title="Delete Folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete folder "${folder.name}"?`)) {
                          onDeleteFolder(folder.id);
                        }
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
};
