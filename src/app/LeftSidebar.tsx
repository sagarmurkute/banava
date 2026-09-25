import React from 'react';
import { LayersPanel } from '../layers/LayersPanel';
import { PagesPanel } from '../pages/PagesPanel';
import './app.css';

export const LeftSidebar: React.FC = () => {
  return (
    <aside className="app-left-sidebar">
      <PagesPanel />
      <div className="sidebar-divider" />
      <div className="flex-1 overflow-hidden">
        <LayersPanel />
      </div>
    </aside>
  );
};
