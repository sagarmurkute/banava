import React from 'react';
import { PanelSection } from '../components/ui/PanelSection';
import { SelectInput } from '../components/ui/SelectInput';
import { NumberInput } from '../components/ui/NumberInput';
import type { SceneObject, SizingMode, FrameObject } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';

interface SizingInspectorProps {
  target: SceneObject;
}

const WIDTH_SIZING_OPTIONS = [
  { value: 'fixed', label: 'Fixed width' },
  { value: 'hug', label: 'Hug contents' },
  { value: 'fill', label: 'Fill container' },
];

const HEIGHT_SIZING_OPTIONS = [
  { value: 'fixed', label: 'Fixed height' },
  { value: 'hug', label: 'Hug contents' },
  { value: 'fill', label: 'Fill container' },
];

export const SizingInspector: React.FC<SizingInspectorProps> = ({ target }) => {
  const { getActivePage, updateObject } = useDocumentStore();
  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  const parent = target.parentId ? objects.find((o) => o.id === target.parentId) : null;
  const isTargetAutoLayoutFrame = target.type === 'frame' && (target as FrameObject).layoutMode && (target as FrameObject).layoutMode !== 'none';
  const isParentAutoLayout = parent && parent.type === 'frame' && (parent as FrameObject).layoutMode && (parent as FrameObject).layoutMode !== 'none';

  // Sizing modes
  const sizingHorizontal: SizingMode = target.sizingHorizontal || 'fixed';
  const sizingVertical: SizingMode = target.sizingVertical || 'fixed';

  // Filter valid options based on context
  const validWidthOptions = WIDTH_SIZING_OPTIONS.filter((opt) => {
    if (opt.value === 'fill' && !isParentAutoLayout) return false;
    if (opt.value === 'hug' && !isTargetAutoLayoutFrame && target.type !== 'text') return false;
    return true;
  });

  const validHeightOptions = HEIGHT_SIZING_OPTIONS.filter((opt) => {
    if (opt.value === 'fill' && !isParentAutoLayout) return false;
    if (opt.value === 'hug' && !isTargetAutoLayoutFrame && target.type !== 'text') return false;
    return true;
  });

  const handleWidthSizing = (val: string) => {
    updateObject(target.id, { sizingHorizontal: val as SizingMode }, true);
  };

  const handleHeightSizing = (val: string) => {
    updateObject(target.id, { sizingVertical: val as SizingMode }, true);
  };

  const hasMinMax =
    target.minWidth !== undefined ||
    target.maxWidth !== undefined ||
    target.minHeight !== undefined ||
    target.maxHeight !== undefined;

  const [showMinMax, setShowMinMax] = React.useState(hasMinMax);

  return (
    <PanelSection title="Sizing & Limits">
      <div className="inspector-row-2col">
        <div className="inspector-field-group">
          <span className="field-label">Width</span>
          <SelectInput
            value={sizingHorizontal}
            options={validWidthOptions}
            onChange={handleWidthSizing}
          />
        </div>
        <div className="inspector-field-group">
          <span className="field-label">Height</span>
          <SelectInput
            value={sizingVertical}
            options={validHeightOptions}
            onChange={handleHeightSizing}
          />
        </div>
      </div>

      <div className="minmax-toggle-row">
        <button
          type="button"
          className="minmax-toggle-btn"
          onClick={() => setShowMinMax(!showMinMax)}
        >
          {showMinMax ? '▾ Hide Min / Max Limits' : '▸ Show Min / Max Limits'}
        </button>
      </div>

      {showMinMax && (
        <div className="minmax-fields-grid">
          <div className="inspector-row-2col">
            <NumberInput
              label="Min W"
              value={target.minWidth ?? 0}
              onChange={(val) =>
                updateObject(target.id, { minWidth: val > 0 ? val : undefined }, true)
              }
              min={0}
              suffix="px"
            />
            <NumberInput
              label="Max W"
              value={target.maxWidth ?? 0}
              onChange={(val) =>
                updateObject(target.id, { maxWidth: val > 0 ? val : undefined }, true)
              }
              min={0}
              suffix="px"
            />
          </div>
          <div className="inspector-row-2col">
            <NumberInput
              label="Min H"
              value={target.minHeight ?? 0}
              onChange={(val) =>
                updateObject(target.id, { minHeight: val > 0 ? val : undefined }, true)
              }
              min={0}
              suffix="px"
            />
            <NumberInput
              label="Max H"
              value={target.maxHeight ?? 0}
              onChange={(val) =>
                updateObject(target.id, { maxHeight: val > 0 ? val : undefined }, true)
              }
              min={0}
              suffix="px"
            />
          </div>
        </div>
      )}
    </PanelSection>
  );
};
