import React from 'react';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import { PanelSection } from '../components/ui/PanelSection';
import { IconButton } from '../components/ui/IconButton';
import { NumberInput } from '../components/ui/NumberInput';
import { SelectInput } from '../components/ui/SelectInput';
import type { FrameObject, LayoutGridConfig } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';

interface LayoutGridInspectorProps {
  target: FrameObject;
}

const GRID_TYPE_OPTIONS = [
  { value: 'columns', label: 'Columns' },
  { value: 'rows', label: 'Rows' },
  { value: 'grid', label: 'Uniform Grid' },
];

export const LayoutGridInspector: React.FC<LayoutGridInspectorProps> = ({ target }) => {
  const { updateObject } = useDocumentStore();
  const layoutGrids = target.layoutGrids || [];

  const handleAddGrid = () => {
    const newGrid: LayoutGridConfig = {
      id: `grid_${Date.now()}`,
      type: 'columns',
      count: 12,
      gutter: 20,
      margin: 32,
      color: 'rgba(255, 0, 100, 0.08)',
      visible: true,
      enabled: true,
    };
    updateObject(target.id, { layoutGrids: [...layoutGrids, newGrid] }, true);
  };

  const handleUpdateGrid = (index: number, updates: Partial<LayoutGridConfig>) => {
    const updated = layoutGrids.map((g, i) => (i === index ? { ...g, ...updates } : g));
    updateObject(target.id, { layoutGrids: updated }, true);
  };

  const handleDeleteGrid = (index: number) => {
    const updated = layoutGrids.filter((_, i) => i !== index);
    updateObject(target.id, { layoutGrids: updated }, true);
  };

  return (
    <PanelSection
      title="Layout Grid"
      action={
        <IconButton
          icon={<Plus size={14} />}
          size="sm"
          tooltip="Add layout grid"
          onClick={handleAddGrid}
        />
      }
    >
      {layoutGrids.length === 0 ? (
        <div className="layout-grid-empty">No layout grids added</div>
      ) : (
        <div className="layout-grids-list">
          {layoutGrids.map((grid, index) => {
            const gridId = grid.id || `grid_${index}`;
            const isVisible = grid.visible !== false;

            return (
              <div key={gridId} className="layout-grid-item">
                <div className="layout-grid-header">
                  <SelectInput
                    value={grid.type}
                    options={GRID_TYPE_OPTIONS}
                    onChange={(val) =>
                      handleUpdateGrid(index, { type: val as LayoutGridConfig['type'] })
                    }
                  />
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                      size="sm"
                      tooltip={isVisible ? 'Hide grid' : 'Show grid'}
                      onClick={() => handleUpdateGrid(index, { visible: !isVisible })}
                    />
                    <IconButton
                      icon={<Trash2 size={13} />}
                      size="sm"
                      tooltip="Remove grid"
                      onClick={() => handleDeleteGrid(index)}
                    />
                  </div>
                </div>

                {grid.type !== 'grid' && (
                  <div className="inspector-row-3col mt-2">
                    <NumberInput
                      label="Count"
                      value={grid.count || 12}
                      onChange={(val) =>
                        handleUpdateGrid(index, { count: Math.max(1, Math.round(val)) })
                      }
                      min={1}
                      max={64}
                    />
                    <NumberInput
                      label="Gutter"
                      value={grid.gutter || 20}
                      onChange={(val) =>
                        handleUpdateGrid(index, { gutter: Math.max(0, Math.round(val)) })
                      }
                      min={0}
                    />
                    <NumberInput
                      label="Margin"
                      value={grid.margin || 0}
                      onChange={(val) =>
                        handleUpdateGrid(index, { margin: Math.max(0, Math.round(val)) })
                      }
                      min={0}
                    />
                  </div>
                )}

                {grid.type === 'grid' && (
                  <div className="inspector-row-2col mt-2">
                    <NumberInput
                      label="Size"
                      value={grid.gutter || 10}
                      onChange={(val) =>
                        handleUpdateGrid(index, { gutter: Math.max(2, Math.round(val)) })
                      }
                      min={2}
                      suffix="px"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelSection>
  );
};
