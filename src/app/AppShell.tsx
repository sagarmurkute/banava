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
import { ShareDocumentModal } from '../collaboration/permissions/ShareDocumentModal';
import { CommentsSidebar } from '../collaboration/comments/CommentsSidebar';
import { RealtimeProvider } from '../collaboration/websocket/realtimeProvider';
import { YjsManager } from '../collaboration/yjs/yjsManager';
import { usePermissionsStore } from '../collaboration/permissions/usePermissionsStore';
import { useAuthStore } from '../backend/auth/useAuthStore';
import { useDocumentStore } from '../state/useDocumentStore';
import { SyncEngine } from '../backend/sync/syncEngine';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useUIStore } from '../state/useUIStore';
import './app.css';

export const AppShell: React.FC = () => {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();
  const { viewMode, isCommentsSidebarOpen, toggleCommentsSidebar } = useUIStore();
  const { doc } = useDocumentStore();

  useEffect(() => {
    // Initialize Auth session & Sync engine
    useAuthStore.getState().initialize();
    SyncEngine.initialize();
  }, []);

  // Real-time Collaboration connection lifecycle
  useEffect(() => {
    if (doc) {
      RealtimeProvider.getInstance().joinDocument(doc.id, doc);
      usePermissionsStore.getState().loadCollaborators(doc.id, doc.metadata?.author);
    }
  }, [doc?.id]);

  // Sync store document changes to Yjs CRDT
  useEffect(() => {
    if (doc) {
      YjsManager.getInstance().syncLocalChange(doc);
    }
  }, [doc]);

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

          {/* Phase 8 Collaboration Sidebar */}
          <CommentsSidebar
            isOpen={isCommentsSidebarOpen}
            onClose={toggleCommentsSidebar}
          />
        </div>
      )}

      {/* Global Modals */}
      <RecoveryModal />
      <AuthModal />
      <AccountSettingsModal />
      <ShareDocumentModal />
    </>
  );
};


