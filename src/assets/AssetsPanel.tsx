import React, { useState } from 'react';
import {
  Search,
  Component as ComponentIcon,
  Palette,
  Type,
  Sparkles,
  Sliders,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import type { ComponentDefinition } from '../types/document';
import './assets.css';

const CATEGORIES = ['All', 'Buttons', 'Inputs', 'Cards', 'Navigation', 'Icons'];

export const AssetsPanel: React.FC = () => {
  const { doc, createInstance } = useDocumentStore();
  const { select } = useSelectionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'components' | 'styles' | 'variables'>('components');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const components = Object.values(doc.components || {});
  const colorStyles = Object.values(doc.styles?.colorStyles || {});
  const textStyles = Object.values(doc.styles?.textStyles || {});
  const effectStyles = Object.values(doc.styles?.effectStyles || {});
  const variables = Object.values(doc.variables?.variables || {});

  const toggleCategoryCollapse = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Filter components
  const filteredComponents = components.filter((comp) => {
    const matchesSearch =
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || comp.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedComponents: Record<string, ComponentDefinition[]> = {};
  filteredComponents.forEach((c) => {
    const cat = c.category || 'General';
    if (!groupedComponents[cat]) groupedComponents[cat] = [];
    groupedComponents[cat].push(c);
  });

  const handleDragStartComponent = (e: React.DragEvent, componentId: string) => {
    e.dataTransfer.setData('text/component-id', componentId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickInsert = (componentId: string) => {
    // Insert into center of viewport
    const instId = createInstance(componentId, 200, 200);
    if (instId) {
      select(instId);
    }
  };

  return (
    <div className="assets-panel-container">
      {/* Sub-navigation tabs */}
      <div className="assets-subnav-tabs">
        <button
          className={`assets-tab-btn ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          <ComponentIcon size={13} />
          <span>Components ({components.length})</span>
        </button>
        <button
          className={`assets-tab-btn ${activeTab === 'styles' ? 'active' : ''}`}
          onClick={() => setActiveTab('styles')}
        >
          <Palette size={13} />
          <span>Styles</span>
        </button>
        <button
          className={`assets-tab-btn ${activeTab === 'variables' ? 'active' : ''}`}
          onClick={() => setActiveTab('variables')}
        >
          <Sliders size={13} />
          <span>Tokens</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="assets-search-box">
        <Search size={13} className="assets-search-icon" />
        <input
          type="text"
          className="assets-search-input"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tab Content: Components */}
      {activeTab === 'components' && (
        <div className="assets-content-scroll">
          {/* Categories Pill Bar */}
          <div className="assets-categories-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {components.length === 0 ? (
            <div className="assets-empty-state">
              <ComponentIcon size={24} className="assets-empty-icon" />
              <span className="assets-empty-title">No Local Components</span>
              <span className="assets-empty-desc">
                Select any frame or shape on canvas and press{' '}
                <kbd className="kbd-shortcut">Ctrl + Alt + K</kbd> to create a master component.
              </span>
            </div>
          ) : Object.keys(groupedComponents).length === 0 ? (
            <div className="assets-empty-state">
              <span>No matching components found</span>
            </div>
          ) : (
            <div className="assets-groups-list">
              {Object.entries(groupedComponents).map(([catName, comps]) => {
                const isCollapsed = collapsedCategories[catName];
                return (
                  <div key={catName} className="assets-category-group">
                    <div
                      className="assets-category-header"
                      onClick={() => toggleCategoryCollapse(catName)}
                    >
                      <span className="assets-collapse-arrow">
                        {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                      <span className="assets-category-title">
                        {catName} ({comps.length})
                      </span>
                    </div>

                    {!isCollapsed && (
                      <div className="assets-cards-grid">
                        {comps.map((comp) => (
                          <div
                            key={comp.id}
                            className="component-asset-card"
                            draggable
                            onDragStart={(e) => handleDragStartComponent(e, comp.id)}
                            onClick={() => handleQuickInsert(comp.id)}
                            title="Click or drag onto canvas to insert instance"
                          >
                            <div className="asset-card-preview">
                              <ComponentIcon size={16} className="component-badge-icon" />
                            </div>
                            <div className="asset-card-info">
                              <span className="asset-card-name truncate">{comp.name}</span>
                              {comp.description && (
                                <span className="asset-card-desc truncate">
                                  {comp.description}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Styles */}
      {activeTab === 'styles' && (
        <div className="assets-content-scroll">
          {/* Color Styles */}
          <div className="assets-category-group">
            <div className="assets-category-header">
              <span className="assets-category-title">Color Styles ({colorStyles.length})</span>
            </div>
            <div className="styles-items-list">
              {colorStyles.map((style) => (
                <div key={style.id} className="style-item-row">
                  <div
                    className="style-color-swatch"
                    style={{ backgroundColor: style.color }}
                  />
                  <div className="style-item-info">
                    <span className="style-item-name">{style.name}</span>
                    <span className="style-item-sub">{style.color}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography Styles */}
          <div className="assets-category-group mt-3">
            <div className="assets-category-header">
              <span className="assets-category-title">Typography Styles ({textStyles.length})</span>
            </div>
            <div className="styles-items-list">
              {textStyles.map((style) => (
                <div key={style.id} className="style-item-row">
                  <Type size={14} className="text-muted" />
                  <div className="style-item-info">
                    <span className="style-item-name">{style.name}</span>
                    <span className="style-item-sub">
                      {style.fontSize}px • {style.fontWeight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Effect Styles */}
          <div className="assets-category-group mt-3">
            <div className="assets-category-header">
              <span className="assets-category-title">Effect Styles ({effectStyles.length})</span>
            </div>
            <div className="styles-items-list">
              {effectStyles.map((style) => (
                <div key={style.id} className="style-item-row">
                  <Sparkles size={14} className="text-accent" />
                  <div className="style-item-info">
                    <span className="style-item-name">{style.name}</span>
                    <span className="style-item-sub">{style.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Variables / Tokens */}
      {activeTab === 'variables' && (
        <div className="assets-content-scroll">
          <div className="assets-category-group">
            <div className="assets-category-header">
              <span className="assets-category-title">Design Tokens ({variables.length})</span>
            </div>
            <div className="styles-items-list">
              {variables.map((v) => {
                const sampleVal = Object.values(v.valuesByMode)[0];
                return (
                  <div key={v.id} className="style-item-row">
                    {v.type === 'color' ? (
                      <div
                        className="style-color-swatch"
                        style={{ backgroundColor: sampleVal }}
                      />
                    ) : (
                      <span className="token-type-pill">{v.type}</span>
                    )}
                    <div className="style-item-info">
                      <span className="style-item-name">{v.name}</span>
                      <span className="style-item-sub">{String(sampleVal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
