import React from 'react';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { CanvasWorkspace } from '../canvas/CanvasWorkspace';
import { RightInspector } from '../inspector/RightInspector';
import { BottomBar } from './BottomBar';
import { PrototypePlayer } from '../prototype/preview/PrototypePlayer';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import './app.css';

export const AppShell: React.FC = () => {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();

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
    </div>
  );
};
