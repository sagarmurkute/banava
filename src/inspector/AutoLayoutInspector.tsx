import React from 'react';
import {
  Rows,
  Columns,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  WrapText,
} from 'lucide-react';
import { NumberInput } from '../components/ui/NumberInput';
import { IconButton } from '../components/ui/IconButton';
import { PanelSection } from '../components/ui/PanelSection';
import type { FrameObject, LayoutMode } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';

interface AutoLayoutInspectorProps {
  frame?: FrameObject;
  target?: FrameObject;
  onUpdate?: (updates: Partial<FrameObject>) => void;
}

export const AutoLayoutInspector: React.FC<AutoLayoutInspectorProps> = ({ frame: propFrame, target, onUpdate: propOnUpdate }) => {
  const { updateObject } = useDocumentStore();
  const frame = target || propFrame!;
  const onUpdate = propOnUpdate || ((updates: Partial<FrameObject>) => updateObject(frame.id, updates, true));

  const isAuto = frame.layoutMode && frame.layoutMode !== 'none';
  const padding = frame.padding || { top: 0, right: 0, bottom: 0, left: 0 };

  const handleModeChange = (mode: LayoutMode) => {
    onUpdate({
      layoutMode: mode,
      itemSpacing: frame.itemSpacing ?? 10,
      padding: frame.padding || { top: 10, right: 10, bottom: 10, left: 10 },
      primaryAxisAlignItems: frame.primaryAxisAlignItems || 'start',
      counterAxisAlignItems: frame.counterAxisAlignItems || 'start',
      layoutWrap: frame.layoutWrap || 'none',
      sizingHorizontal: mode === 'none' ? 'fixed' : (frame.sizingHorizontal || 'hug'),
      sizingVertical: mode === 'none' ? 'fixed' : (frame.sizingVertical || 'hug'),
    });
  };

  const handleUniformPadding = (val: number) => {
    onUpdate({
      padding: { top: val, right: val, bottom: val, left: val },
    });
  };

  return (
    <PanelSection title="Auto Layout">
      {/* Direction Switcher */}
      <div className="flex items-center justify-between gap-1">
        <span className="field-label">Direction</span>
        <div className="flex gap-1">
          <IconButton
            icon={<Minus size={14} />}
            isActive={!isAuto}
            size="sm"
            tooltip="None"
            onClick={() => handleModeChange('none')}
          />
          <IconButton
            icon={<Columns size={14} />}
            isActive={frame.layoutMode === 'horizontal'}
            size="sm"
            tooltip="Horizontal Layout"
            onClick={() => handleModeChange('horizontal')}
          />
          <IconButton
            icon={<Rows size={14} />}
            isActive={frame.layoutMode === 'vertical'}
            size="sm"
            tooltip="Vertical Layout"
            onClick={() => handleModeChange('vertical')}
          />
        </div>
      </div>

      {isAuto && (
        <>
          {/* Spacing / Gap */}
          <div className="inspector-row-2col">
            <NumberInput
              label="Gap"
              value={frame.itemSpacing ?? 0}
              onChange={(val) => onUpdate({ itemSpacing: Math.max(0, val) })}
              min={0}
              suffix="px"
            />
            <NumberInput
              label="Pad"
              value={padding.top}
              onChange={handleUniformPadding}
              min={0}
              suffix="px"
            />
          </div>

          {/* Independent Padding Inputs */}
          <div className="inspector-row-2col">
            <NumberInput
              label="T"
              value={padding.top}
              onChange={(v) => onUpdate({ padding: { ...padding, top: Math.max(0, v) } })}
              min={0}
            />
            <NumberInput
              label="R"
              value={padding.right}
              onChange={(v) => onUpdate({ padding: { ...padding, right: Math.max(0, v) } })}
              min={0}
            />
          </div>
          <div className="inspector-row-2col">
            <NumberInput
              label="B"
              value={padding.bottom}
              onChange={(v) => onUpdate({ padding: { ...padding, bottom: Math.max(0, v) } })}
              min={0}
            />
            <NumberInput
              label="L"
              value={padding.left}
              onChange={(v) => onUpdate({ padding: { ...padding, left: Math.max(0, v) } })}
              min={0}
            />
          </div>

          {/* Primary Axis Alignment */}
          <div className="flex items-center justify-between gap-1">
            <span className="field-label">Primary Align</span>
            <div className="flex gap-1">
              <IconButton
                icon={<AlignLeft size={14} />}
                isActive={frame.primaryAxisAlignItems === 'start' || !frame.primaryAxisAlignItems}
                size="sm"
                tooltip="Start (Packed)"
                onClick={() => onUpdate({ primaryAxisAlignItems: 'start' })}
              />
              <IconButton
                icon={<AlignCenter size={14} />}
                isActive={frame.primaryAxisAlignItems === 'center'}
                size="sm"
                tooltip="Center"
                onClick={() => onUpdate({ primaryAxisAlignItems: 'center' })}
              />
              <IconButton
                icon={<AlignRight size={14} />}
                isActive={frame.primaryAxisAlignItems === 'end'}
                size="sm"
                tooltip="End"
                onClick={() => onUpdate({ primaryAxisAlignItems: 'end' })}
              />
              <IconButton
                icon={<AlignJustify size={14} />}
                isActive={frame.primaryAxisAlignItems === 'space-between'}
                size="sm"
                tooltip="Space Between"
                onClick={() => onUpdate({ primaryAxisAlignItems: 'space-between' })}
              />
            </div>
          </div>

          {/* Counter Axis Alignment */}
          <div className="flex items-center justify-between gap-1">
            <span className="field-label">Cross Align</span>
            <div className="flex gap-1">
              <IconButton
                icon={<AlignLeft size={14} />}
                isActive={frame.counterAxisAlignItems === 'start' || !frame.counterAxisAlignItems}
                size="sm"
                tooltip="Start"
                onClick={() => onUpdate({ counterAxisAlignItems: 'start' })}
              />
              <IconButton
                icon={<AlignCenter size={14} />}
                isActive={frame.counterAxisAlignItems === 'center'}
                size="sm"
                tooltip="Center"
                onClick={() => onUpdate({ counterAxisAlignItems: 'center' })}
              />
              <IconButton
                icon={<AlignRight size={14} />}
                isActive={frame.counterAxisAlignItems === 'end'}
                size="sm"
                tooltip="End"
                onClick={() => onUpdate({ counterAxisAlignItems: 'end' })}
              />
              <IconButton
                icon={<AlignJustify size={14} />}
                isActive={frame.counterAxisAlignItems === 'stretch'}
                size="sm"
                tooltip="Stretch"
                onClick={() => onUpdate({ counterAxisAlignItems: 'stretch' })}
              />
            </div>
          </div>

          {/* Wrap */}
          <div className="flex items-center justify-between gap-1">
            <span className="field-label">Wrap</span>
            <IconButton
              icon={<WrapText size={14} />}
              isActive={frame.layoutWrap === 'wrap'}
              size="sm"
              tooltip="Wrap contents"
              onClick={() => onUpdate({ layoutWrap: frame.layoutWrap === 'wrap' ? 'none' : 'wrap' })}
            />
          </div>
        </>
      )}
    </PanelSection>
  );
};
