import React from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUpToLine,
  ArrowDownToLine,
  Columns,
  Rows,
  Sliders,
  Trash2,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  Star,
  Triangle,
  Component as ComponentIcon,
} from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import { useSelectionStore } from '../state/useSelectionStore';
import { NumberInput } from '../components/ui/NumberInput';
import { ColorInput } from '../components/ui/ColorInput';
import { SelectInput } from '../components/ui/SelectInput';
import { PanelSection } from '../components/ui/PanelSection';
import { IconButton } from '../components/ui/IconButton';
import { calculateBoundingBox } from '../utils/geometry';
import { AutoLayoutInspector } from './AutoLayoutInspector';
import { ConstraintsInspector } from './ConstraintsInspector';
import { SizingInspector } from './SizingInspector';
import { LayoutGridInspector } from './LayoutGridInspector';
import { ComponentInspector } from './ComponentInspector';
import { InstanceInspector } from './InstanceInspector';
import { StylePickerDropdown } from './StylePickerDropdown';
import type {
  RectangleObject,
  FrameObject,
  TextObject,
  PolygonObject,
  ImageObject,
  LineObject,
  SceneObject,
  ComponentInstanceObject,
} from '../types/document';
import './inspector.css';

const FONT_FAMILIES = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'system-ui, sans-serif', label: 'System' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Courier New, monospace', label: 'Monospace' },
];

const FONT_WEIGHTS = [
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi-Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra-Bold (800)' },
];

const AUTO_RESIZE_OPTIONS = [
  { value: 'auto-width', label: 'Auto Width' },
  { value: 'auto-height', label: 'Auto Height' },
  { value: 'fixed', label: 'Fixed Size' },
];

const IMAGE_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
];

export const RightInspector: React.FC = () => {
  const {
    getActivePage,
    updateObject,
    updateObjects,
    deleteObjects,
    alignObjects,
    reorderObject,
    createComponent,
  } = useDocumentStore();
  const { selectedIds } = useSelectionStore();

  const activePage = getActivePage();
  const objects = activePage?.objects || [];

  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));
  const count = selectedObjects.length;

  if (count === 0) {
    return (
      <aside className="app-right-inspector empty">
        <div className="inspector-empty-state">
          <Sliders size={28} className="inspector-empty-icon" />
          <span className="inspector-empty-title">No Selection</span>
          <span className="inspector-empty-desc">
            Select an object on the canvas to inspect and edit its properties.
          </span>
        </div>
      </aside>
    );
  }

  // Multi-selection view
  if (count > 1) {
    const bbox = calculateBoundingBox(selectedObjects);

    return (
      <aside className="app-right-inspector">
        <div className="inspector-header">
          <span className="inspector-title">{count} Objects Selected</span>
          <IconButton
            icon={<Trash2 size={14} />}
            size="sm"
            tooltip="Delete selection"
            onClick={() => deleteObjects(selectedIds)}
          />
        </div>

        {/* Alignment & Distribution */}
        <PanelSection title="Align & Distribute">
          <div className="align-buttons-grid">
            <IconButton
              icon={<AlignLeft size={14} />}
              tooltip="Align left"
              size="sm"
              onClick={() => alignObjects('left', selectedIds)}
            />
            <IconButton
              icon={<AlignCenter size={14} />}
              tooltip="Align horizontal center"
              size="sm"
              onClick={() => alignObjects('center', selectedIds)}
            />
            <IconButton
              icon={<AlignRight size={14} />}
              tooltip="Align right"
              size="sm"
              onClick={() => alignObjects('right', selectedIds)}
            />
            <IconButton
              icon={<ArrowUpToLine size={14} />}
              tooltip="Align top"
              size="sm"
              onClick={() => alignObjects('top', selectedIds)}
            />
            <IconButton
              icon={<AlignJustify size={14} />}
              tooltip="Align vertical middle"
              size="sm"
              onClick={() => alignObjects('middle', selectedIds)}
            />
            <IconButton
              icon={<ArrowDownToLine size={14} />}
              tooltip="Align bottom"
              size="sm"
              onClick={() => alignObjects('bottom', selectedIds)}
            />
            <IconButton
              icon={<Columns size={14} />}
              tooltip="Distribute horizontally"
              size="sm"
              onClick={() => alignObjects('distribute-h', selectedIds)}
            />
            <IconButton
              icon={<Rows size={14} />}
              tooltip="Distribute vertically"
              size="sm"
              onClick={() => alignObjects('distribute-v', selectedIds)}
            />
          </div>
        </PanelSection>

        {/* Combined Bounding Box */}
        {bbox && (
          <PanelSection title="Combined Bounds">
            <div className="inspector-row-2col">
              <NumberInput label="X" value={Math.round(bbox.minX)} onChange={() => {}} />
              <NumberInput label="Y" value={Math.round(bbox.minY)} onChange={() => {}} />
            </div>
            <div className="inspector-row-2col">
              <NumberInput label="W" value={Math.round(bbox.width)} onChange={() => {}} min={1} />
              <NumberInput label="H" value={Math.round(bbox.height)} onChange={() => {}} min={1} />
            </div>
          </PanelSection>
        )}

        {/* Batch Opacity */}
        <PanelSection title="Batch Appearance">
          <div className="inspector-field-group">
            <span className="field-label">Opacity</span>
            <NumberInput
              value={selectedObjects[0].opacity ?? 100}
              onChange={(val) => {
                const updates: Record<string, Partial<SceneObject>> = {};
                selectedObjects.forEach((o) => (updates[o.id] = { opacity: val }));
                updateObjects(updates, true);
              }}
              min={0}
              max={100}
              suffix="%"
            />
          </div>
        </PanelSection>
      </aside>
    );
  }

  // Single Object Selection View
  const target = selectedObjects[0];

  const handleUpdate = (updates: Record<string, unknown>) => {
    updateObject(target.id, updates as Partial<SceneObject>, true);
  };

  const parent = target.parentId ? objects.find((o) => o.id === target.parentId) : null;
  const isParentFrame = parent && (parent.type === 'frame' || parent.type === 'instance');
  const isParentAutoLayout =
    isParentFrame && (parent as FrameObject).layoutMode && (parent as FrameObject).layoutMode !== 'none';
  const isTargetFrame = target.type === 'frame' || target.type === 'instance';

  return (
    <aside className="app-right-inspector">
      <div className="inspector-header">
        <div className="flex items-center gap-1.5 truncate">
          {target.isComponent && <ComponentIcon size={14} className="text-purple-400 flex-shrink-0" />}
          {target.type === 'instance' && <ComponentIcon size={14} className="text-indigo-400 flex-shrink-0" />}
          <span className="inspector-title truncate">{target.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {!target.isComponent && target.type !== 'instance' && (
            <IconButton
              icon={<ComponentIcon size={13} />}
              size="sm"
              tooltip="Create Component (Ctrl+Alt+K)"
              onClick={() => createComponent(target.id)}
            />
          )}
          <IconButton
            icon={<ChevronsUp size={13} />}
            size="sm"
            tooltip="Bring to front"
            onClick={() => reorderObject(target.id, 'top')}
          />
          <IconButton
            icon={<ArrowUp size={13} />}
            size="sm"
            tooltip="Bring forward"
            onClick={() => reorderObject(target.id, 'up')}
          />
          <IconButton
            icon={<ArrowDown size={13} />}
            size="sm"
            tooltip="Send backward"
            onClick={() => reorderObject(target.id, 'down')}
          />
          <IconButton
            icon={<ChevronsDown size={13} />}
            size="sm"
            tooltip="Send to back"
            onClick={() => reorderObject(target.id, 'bottom')}
          />
          <IconButton
            icon={<Trash2 size={13} />}
            size="sm"
            tooltip="Delete object"
            onClick={() => deleteObjects([target.id])}
          />
        </div>
      </div>

      {/* Phase 4: Master Component Inspector */}
      {target.isComponent && <ComponentInspector target={target} />}

      {/* Phase 4: Component Instance Inspector */}
      {target.type === 'instance' && (
        <InstanceInspector target={target as ComponentInstanceObject} />
      )}

      {/* Position & Transform */}
      <PanelSection title="Transform">
        <div className="inspector-row-2col">
          <NumberInput
            label="X"
            value={target.x}
            onChange={(val) => handleUpdate({ x: val })}
          />
          <NumberInput
            label="Y"
            value={target.y}
            onChange={(val) => handleUpdate({ y: val })}
          />
        </div>
        <div className="inspector-row-2col">
          <NumberInput
            label="W"
            value={target.width}
            onChange={(val) => handleUpdate({ width: Math.max(1, val) })}
            min={1}
          />
          <NumberInput
            label="H"
            value={target.height}
            onChange={(val) => handleUpdate({ height: Math.max(0, val) })}
            min={0}
          />
        </div>
        <div className="inspector-row-2col">
          <NumberInput
            label="∠"
            value={target.rotation || 0}
            onChange={(val) => handleUpdate({ rotation: ((val % 360) + 360) % 360 })}
            suffix="°"
          />
          {/* Corner radius for rectangles, frames, images, instances */}
          {(target.type === 'rectangle' ||
            target.type === 'frame' ||
            target.type === 'instance' ||
            target.type === 'image') && (
            <NumberInput
              label="R"
              value={(target as RectangleObject | FrameObject | ImageObject).cornerRadius || 0}
              onChange={(val) => handleUpdate({ cornerRadius: Math.max(0, val) })}
              min={0}
              suffix="px"
            />
          )}
        </div>
      </PanelSection>

      {/* Auto Layout section for frames/instances */}
      {isTargetFrame && <AutoLayoutInspector target={target as FrameObject} />}

      {/* Sizing & limits inspector */}
      {(isTargetFrame || isParentFrame) && <SizingInspector target={target} />}

      {/* Constraints inspector for objects in non-Auto-Layout frames */}
      {isParentFrame && !isParentAutoLayout && <ConstraintsInspector target={target} />}

      {/* Layout Grid Inspector for Frames */}
      {isTargetFrame && <LayoutGridInspector target={target as FrameObject} />}

      {/* Polygon Specific Settings */}
      {target.type === 'polygon' && (
        <PanelSection title="Polygon / Star">
          <div className="inspector-row-2col">
            <NumberInput
              label="Points"
              value={(target as PolygonObject).points || 3}
              onChange={(val) => handleUpdate({ points: Math.max(3, Math.min(20, Math.round(val))) })}
              min={3}
              max={20}
            />
            <div className="flex items-center gap-2 mt-1">
              <IconButton
                icon={<Triangle size={14} />}
                isActive={!(target as PolygonObject).isStar}
                size="sm"
                tooltip="Regular Polygon"
                onClick={() => handleUpdate({ isStar: false })}
              />
              <IconButton
                icon={<Star size={14} />}
                isActive={(target as PolygonObject).isStar}
                size="sm"
                tooltip="Star Shape"
                onClick={() => handleUpdate({ isStar: true })}
              />
            </div>
          </div>
          {(target as PolygonObject).isStar && (
            <div className="inspector-field-group">
              <span className="field-label">Inner Star Ratio</span>
              <NumberInput
                value={Math.round(((target as PolygonObject).starRatio || 0.5) * 100)}
                onChange={(val) => handleUpdate({ starRatio: Math.max(0.1, Math.min(0.9, val / 100)) })}
                min={10}
                max={90}
                suffix="%"
              />
            </div>
          )}
        </PanelSection>
      )}

      {/* Image Specific Settings */}
      {target.type === 'image' && (
        <PanelSection title="Image Settings">
          <div className="inspector-field-group">
            <span className="field-label">Image Fit</span>
            <SelectInput
              value={(target as ImageObject).fit || 'cover'}
              options={IMAGE_FIT_OPTIONS}
              onChange={(val) => handleUpdate({ fit: val })}
            />
          </div>
        </PanelSection>
      )}

      {/* Appearance: Fill, Stroke, Opacity */}
      <PanelSection title="Appearance">
        {'fill' in target && (
          <div className="inspector-field-group">
            <div className="flex items-center justify-between">
              <span className="field-label">Fill</span>
              <StylePickerDropdown target={target} type="fill-color" />
            </div>
            <ColorInput
              value={(target as RectangleObject | FrameObject | TextObject | PolygonObject).fill || '#ffffff'}
              onChange={(val) => handleUpdate({ fill: val })}
              opacity={target.opacity ?? 100}
              onOpacityChange={(op) => handleUpdate({ opacity: op })}
            />
          </div>
        )}

        {'stroke' in target && (
          <div className="inspector-field-group mt-2">
            <div className="flex items-center justify-between">
              <span className="field-label">Stroke</span>
              <StylePickerDropdown target={target} type="stroke-color" />
            </div>
            <ColorInput
              value={(target as RectangleObject | LineObject).stroke || '#2e3444'}
              onChange={(val) => handleUpdate({ stroke: val })}
              opacity={(target as RectangleObject).strokeOpacity ?? 100}
              onOpacityChange={(op) => handleUpdate({ strokeOpacity: op })}
            />
            <div className="mt-1">
              <NumberInput
                label="Width"
                value={(target as RectangleObject).strokeWidth || 1}
                onChange={(val) => handleUpdate({ strokeWidth: Math.max(0, val) })}
                min={0}
                max={50}
                suffix="px"
              />
            </div>
          </div>
        )}

        {!('fill' in target) && (
          <div className="inspector-field-group">
            <span className="field-label">Opacity</span>
            <NumberInput
              value={target.opacity ?? 100}
              onChange={(val) => handleUpdate({ opacity: val })}
              min={0}
              max={100}
              suffix="%"
            />
          </div>
        )}
      </PanelSection>

      {/* Typography settings for Text objects */}
      {target.type === 'text' && (
        <PanelSection
          title="Typography"
          action={<StylePickerDropdown target={target} type="typography" />}
        >
          <div className="inspector-field-group">
            <span className="field-label">Font</span>
            <SelectInput
              value={(target as TextObject).fontFamily || 'Inter, system-ui, sans-serif'}
              options={FONT_FAMILIES}
              onChange={(val) => handleUpdate({ fontFamily: val })}
            />
          </div>

          <div className="inspector-row-2col">
            <SelectInput
              value={String((target as TextObject).fontWeight || '400')}
              options={FONT_WEIGHTS}
              onChange={(val) => handleUpdate({ fontWeight: val })}
            />
            <NumberInput
              label="Size"
              value={(target as TextObject).fontSize || 14}
              onChange={(val) => handleUpdate({ fontSize: Math.max(6, val) })}
              min={6}
              max={200}
              suffix="px"
            />
          </div>

          <div className="inspector-row-2col">
            <NumberInput
              label="Height"
              value={(target as TextObject).lineHeight || 1.2}
              onChange={(val) => handleUpdate({ lineHeight: Math.max(0.5, Math.min(3, val)) })}
              step={0.1}
            />
            <NumberInput
              label="Spacing"
              value={(target as TextObject).letterSpacing || 0}
              onChange={(val) => handleUpdate({ letterSpacing: val })}
              suffix="px"
            />
          </div>

          <div className="inspector-field-group">
            <span className="field-label">Auto Sizing</span>
            <SelectInput
              value={(target as TextObject).autoResize || 'auto-width'}
              options={AUTO_RESIZE_OPTIONS}
              onChange={(val) => handleUpdate({ autoResize: val })}
            />
          </div>

          <div className="inspector-field-group">
            <span className="field-label">Align</span>
            <div className="flex gap-1">
              <IconButton
                icon={<AlignLeft size={14} />}
                isActive={(target as TextObject).textAlign === 'left'}
                size="sm"
                tooltip="Align left"
                onClick={() => handleUpdate({ textAlign: 'left' })}
              />
              <IconButton
                icon={<AlignCenter size={14} />}
                isActive={(target as TextObject).textAlign === 'center'}
                size="sm"
                tooltip="Align center"
                onClick={() => handleUpdate({ textAlign: 'center' })}
              />
              <IconButton
                icon={<AlignRight size={14} />}
                isActive={(target as TextObject).textAlign === 'right'}
                size="sm"
                tooltip="Align right"
                onClick={() => handleUpdate({ textAlign: 'right' })}
              />
            </div>
          </div>

          <div className="inspector-field-group">
            <span className="field-label">Content</span>
            <textarea
              className="inspector-textarea"
              rows={3}
              value={(target as TextObject).content}
              onChange={(e) => handleUpdate({ content: e.target.value })}
            />
          </div>
        </PanelSection>
      )}

      {/* Frame Clips Content */}
      {isTargetFrame && (
        <PanelSection title="Frame Settings">
          <label className="inspector-checkbox-label">
            <input
              type="checkbox"
              checked={(target as FrameObject).clipsContent}
              onChange={(e) => handleUpdate({ clipsContent: e.target.checked })}
            />
            <span>Clip content</span>
          </label>
        </PanelSection>
      )}
    </aside>
  );
};
