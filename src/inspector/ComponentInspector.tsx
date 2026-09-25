import React, { useState } from 'react';
import { Component as ComponentIcon, Copy } from 'lucide-react';
import { PanelSection } from '../components/ui/PanelSection';
import { IconButton } from '../components/ui/IconButton';
import { SelectInput } from '../components/ui/SelectInput';
import type { SceneObject, ComponentDefinition } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';

interface ComponentInspectorProps {
  target: SceneObject;
}

const CATEGORY_OPTIONS = [
  { value: 'Buttons', label: 'Buttons' },
  { value: 'Inputs', label: 'Inputs' },
  { value: 'Cards', label: 'Cards' },
  { value: 'Navigation', label: 'Navigation' },
  { value: 'Icons', label: 'Icons' },
  { value: 'General', label: 'General' },
];

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({ target }) => {
  const { doc, createInstance } = useDocumentStore();
  const { select } = useSelectionStore();

  const compId = target.componentId;
  const compDef = compId ? doc.components?.[compId] : undefined;

  const [desc, setDesc] = useState(compDef?.description || '');

  const handleCreateInstance = () => {
    if (!compId) return;
    const newInstId = createInstance(compId, target.x + target.width + 40, target.y);
    if (newInstId) {
      select(newInstId);
    }
  };

  const handleCategoryChange = (val: string) => {
    if (!compId || !compDef) return;
    const nextComp: ComponentDefinition = { ...compDef, category: val, updatedAt: Date.now() };
    const nextDoc = {
      ...doc,
      components: {
        ...(doc.components || {}),
        [compId]: nextComp,
      },
    };
    useDocumentStore.setState({ doc: nextDoc });
  };

  const handleDescBlur = () => {
    if (!compId || !compDef) return;
    const nextComp: ComponentDefinition = { ...compDef, description: desc.trim(), updatedAt: Date.now() };
    const nextDoc = {
      ...doc,
      components: {
        ...(doc.components || {}),
        [compId]: nextComp,
      },
    };
    useDocumentStore.setState({ doc: nextDoc });
  };

  return (
    <PanelSection
      title="Master Component"
      action={
        <div className="flex items-center gap-1">
          <IconButton
            icon={<Copy size={13} />}
            size="sm"
            tooltip="Create Instance"
            onClick={handleCreateInstance}
          />
        </div>
      }
    >
      <div className="component-inspector-body">
        <div className="component-badge-header">
          <div className="component-badge-tag">
            <ComponentIcon size={14} className="text-purple-400" />
            <span className="component-badge-label">Master Component</span>
          </div>
          <button
            type="button"
            className="component-quick-inst-btn"
            onClick={handleCreateInstance}
          >
            + New Instance
          </button>
        </div>

        <div className="inspector-field-group mt-2">
          <span className="field-label">Category</span>
          <SelectInput
            value={compDef?.category || 'General'}
            options={CATEGORY_OPTIONS}
            onChange={handleCategoryChange}
          />
        </div>

        <div className="inspector-field-group mt-2">
          <span className="field-label">Description</span>
          <input
            type="text"
            className="inspector-textarea"
            style={{ minHeight: '32px', height: '32px' }}
            placeholder="Component documentation note..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={handleDescBlur}
          />
        </div>
      </div>
    </PanelSection>
  );
};
