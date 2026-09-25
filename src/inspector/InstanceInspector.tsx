import React from 'react';
import {
  Component as ComponentIcon,
  ExternalLink,
  RotateCcw,
  Unlink,
} from 'lucide-react';
import { PanelSection } from '../components/ui/PanelSection';
import { SelectInput } from '../components/ui/SelectInput';
import type { ComponentInstanceObject } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { useViewportStore } from '../state/useViewportStore';

interface InstanceInspectorProps {
  target: ComponentInstanceObject;
}

export const InstanceInspector: React.FC<InstanceInspectorProps> = ({ target }) => {
  const { doc, resetAllInstanceOverrides, detachInstance, switchVariant } = useDocumentStore();
  const { select } = useSelectionStore();
  const { setViewport } = useViewportStore();

  const compId = target.componentId;
  const compDef = compId ? doc.components?.[compId] : undefined;
  const compSet = compDef?.componentSetId ? doc.componentSets?.[compDef.componentSetId] : undefined;

  const overrides = target.overrides || {};
  const overrideCount = Object.values(overrides).reduce(
    (acc, cur) => acc + Object.keys(cur).length,
    0
  );

  const handleGoToMaster = () => {
    if (!compDef) return;
    // Find page and object of master
    for (const page of doc.pages) {
      const found = page.objects.find((o) => o.id === compDef.rootObjectId);
      if (found) {
        useDocumentStore.getState().setActivePage(page.id);
        select(found.id);
        setViewport({
          x: -(found.x - 200),
          y: -(found.y - 150),
          zoom: 1.0,
        });
        break;
      }
    }
  };

  const handleVariantChange = (propName: string, value: string) => {
    switchVariant(target.id, { [propName]: value });
  };

  return (
    <PanelSection title="Component Instance">
      <div className="instance-inspector-body">
        {/* Header link to master */}
        <div className="instance-header-box">
          <div className="instance-master-info">
            <ComponentIcon size={14} className="text-purple-400" />
            <span className="instance-master-name truncate">
              {compDef?.name || 'Master Component'}
            </span>
          </div>
          <button
            type="button"
            className="goto-master-btn"
            onClick={handleGoToMaster}
            title="Go to main component"
          >
            <ExternalLink size={12} />
            <span>Main</span>
          </button>
        </div>

        {/* Variant Properties Controls */}
        {compSet && compSet.variantPropertyNames.length > 0 && (
          <div className="instance-variants-section mt-2">
            <span className="field-label">Variants</span>
            <div className="instance-variants-grid">
              {compSet.variantPropertyNames.map((propName) => {
                // Collect unique options across all variants in the set
                const optionsSet = new Set<string>();
                compSet.componentIds.forEach((cId) => {
                  const vDef = doc.components?.[cId];
                  if (vDef?.variantProperties?.[propName]) {
                    optionsSet.add(vDef.variantProperties[propName]);
                  }
                });
                const options = Array.from(optionsSet).map((opt) => ({
                  value: opt,
                  label: opt,
                }));

                const currentVal =
                  target.variantProperties?.[propName] ||
                  compDef?.variantProperties?.[propName] ||
                  options[0]?.value;

                return (
                  <div key={propName} className="inspector-field-group mt-1">
                    <span className="field-label text-xs">{propName}</span>
                    <SelectInput
                      value={currentVal}
                      options={options}
                      onChange={(val) => handleVariantChange(propName, val)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overrides Status & Actions */}
        <div className="instance-overrides-status mt-3">
          <div className="overrides-count-row">
            <span className="field-label">Overrides:</span>
            <span className="overrides-badge">
              {overrideCount > 0 ? `${overrideCount} overridden` : 'Synced with master'}
            </span>
          </div>

          <div className="instance-actions-row mt-2">
            {overrideCount > 0 && (
              <button
                type="button"
                className="instance-action-btn reset"
                onClick={() => resetAllInstanceOverrides(target.id)}
                title="Reset all overrides back to main component"
              >
                <RotateCcw size={12} />
                <span>Reset Overrides</span>
              </button>
            )}

            <button
              type="button"
              className="instance-action-btn detach"
              onClick={() => detachInstance(target.id)}
              title="Detach instance into standard editable shapes"
            >
              <Unlink size={12} />
              <span>Detach Instance</span>
            </button>
          </div>
        </div>
      </div>
    </PanelSection>
  );
};
