import React from 'react';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { CanvasWorkspace } from '../canvas/CanvasWorkspace';
import { RightInspector } from '../inspector/RightInspector';
import { BottomBar } from './BottomBar';
import { PrototypePlayer } from '../prototype/preview/PrototypePlayer';
import { DocumentDashboard } from '../dashboard/DocumentDashboard';
import { DocumentInfoModal } from './DocumentInfoModal';
import { SnapshotsModal } from './SnapshotsModal';
import { RecoveryModal } from './RecoveryModal';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useUIStore } from '../state/useUIStore';
import './app.css';

export const AppShell: React.FC = () => {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();
  const { viewMode } = useUIStore();

  if (viewMode === 'dashboard') {
    return (
      <>
        <DocumentDashboard />
        <RecoveryModal />
      </>
    );
  }

  return (
    <div className="app-layout-container">
      <TopToolbar />
      <div className="app-main-workspace">
        <LeftSidebar />
        <main className="app-canvas-container-wrapper">
          <CanvasWorkspace />
        </main>
        <div className="app-right-inspector-wrapper">
          <RightInspector />
        </div>
      </div>
      <BottomBar />
      <PrototypePlayer />

      {/* Phase 6 Document Modals */}
      <DocumentInfoModal />
      <SnapshotsModal />
      <RecoveryModal />
    </div>
  );
};
