import React, { useEffect } from 'react';
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
import { AuthModal } from '../backend/auth/AuthModal';
import { AccountSettingsModal } from '../backend/auth/AccountSettingsModal';
import { useAuthStore } from '../backend/auth/useAuthStore';
import { SyncEngine } from '../backend/sync/syncEngine';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useUIStore } from '../state/useUIStore';
import './app.css';

export const AppShell: React.FC = () => {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();
  const { viewMode } = useUIStore();

  useEffect(() => {
    // Initialize Auth session & Sync engine
    useAuthStore.getState().initialize();
    SyncEngine.initialize();
  }, []);

  return (
    <>
      {viewMode === 'dashboard' ? (
        <DocumentDashboard />
      ) : (
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
        </div>
      )}

      {/* Global Modals */}
      <RecoveryModal />
      <AuthModal />
      <AccountSettingsModal />
    </>
  );
};

