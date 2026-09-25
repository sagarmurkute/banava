import React, { useState } from 'react';
import { Layers, Box } from 'lucide-react';
import { LayersPanel } from '../layers/LayersPanel';
import { PagesPanel } from '../pages/PagesPanel';
import { AssetsPanel } from '../assets/AssetsPanel';
import './app.css';

export const LeftSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'layers' | 'assets'>('layers');

  return (
    <aside className="app-left-sidebar">
      {/* Sidebar Header Tabs */}
      <div className="sidebar-main-tabs">
        <button
          className={`sidebar-tab-button ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          <Layers size={13} />
          <span>Layers</span>
        </button>
        <button
          className={`sidebar-tab-button ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <Box size={13} />
          <span>Assets</span>
        </button>
      </div>

      {activeTab === 'layers' ? (
        <>
          <PagesPanel />
          <div className="sidebar-divider" />
          <div className="flex-1 overflow-hidden">
            <LayersPanel />
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-hidden">
          <AssetsPanel />
        </div>
      )}
    </aside>
  );
};
