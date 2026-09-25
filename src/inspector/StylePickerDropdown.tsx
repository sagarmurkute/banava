import React, { useState } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { useDocumentStore } from '../state/useDocumentStore';
import type { SceneObject } from '../types/document';
import { applyColorStyleToObject, applyTextStyleToObject } from '../system/styleEngine';

interface StylePickerDropdownProps {
  target: SceneObject;
  type: 'fill-color' | 'stroke-color' | 'typography';
}

export const StylePickerDropdown: React.FC<StylePickerDropdownProps> = ({ target, type }) => {
  const { doc, updateObject } = useDocumentStore();
  const [isOpen, setIsOpen] = useState(false);

  const colorStyles = Object.values(doc.styles?.colorStyles || {});
  const textStyles = Object.values(doc.styles?.textStyles || {});
  const variables = Object.values(doc.variables?.variables || {}).filter(
    (v) => type === 'typography' || v.type === 'color'
  );

  const activeColorStyleId = type === 'fill-color' ? target.fillStyleId : target.strokeStyleId;
  const activeTextStyleId = target.textStyleId;
  const activeVarId = type === 'fill-color' ? target.fillVariableId : target.strokeVariableId;

  const currentStyleName =
    type === 'typography'
      ? textStyles.find((s) => s.id === activeTextStyleId)?.name
      : colorStyles.find((s) => s.id === activeColorStyleId)?.name ||
        variables.find((v) => v.id === activeVarId)?.name;

  const handleApplyColorStyle = (styleId: string) => {
    const style = doc.styles?.colorStyles[styleId];
    if (!style) return;
    const updates = applyColorStyleToObject(target, style, type === 'fill-color' ? 'fill' : 'stroke');
    updateObject(target.id, updates, true);
    setIsOpen(false);
  };

  const handleApplyTextStyle = (styleId: string) => {
    const style = doc.styles?.textStyles[styleId];
    if (!style || target.type !== 'text') return;
    const updates = applyTextStyleToObject(target, style);
    updateObject(target.id, updates, true);
    setIsOpen(false);
  };

  const handleApplyVariable = (varId: string) => {
    const variable = doc.variables?.variables[varId];
    if (!variable) return;
    const sampleVal = Object.values(variable.valuesByMode)[0];
    if (type === 'fill-color') {
      updateObject(target.id, { fillVariableId: varId, fill: String(sampleVal) }, true);
    } else if (type === 'stroke-color') {
      updateObject(target.id, { strokeVariableId: varId, stroke: String(sampleVal) }, true);
    }
    setIsOpen(false);
  };

  const handleDetachStyle = () => {
    if (type === 'fill-color') {
      updateObject(target.id, { fillStyleId: undefined, fillVariableId: undefined }, true);
    } else if (type === 'stroke-color') {
      updateObject(target.id, { strokeStyleId: undefined, strokeVariableId: undefined }, true);
    } else if (type === 'typography') {
      updateObject(target.id, { textStyleId: undefined }, true);
    }
    setIsOpen(false);
  };

  return (
    <div className="style-picker-dropdown-container">
      {currentStyleName ? (
        <div className="active-style-pill">
          <Palette size={11} className="text-accent" />
          <span className="active-style-label truncate" title={currentStyleName}>
            {currentStyleName}
          </span>
          <button
            type="button"
            className="detach-style-btn"
            onClick={handleDetachStyle}
            title="Detach style reference"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="open-style-picker-btn"
          onClick={() => setIsOpen(!isOpen)}
          title="Choose style or token"
        >
          <Palette size={13} />
          <span>Styles</span>
        </button>
      )}

      {isOpen && (
        <div className="style-picker-popover">
          <div className="style-popover-header">
            <span>{type === 'typography' ? 'Text Styles' : 'Color Styles & Tokens'}</span>
            <button
              type="button"
              className="style-popover-close"
              onClick={() => setIsOpen(false)}
            >
              <X size={12} />
            </button>
          </div>

          <div className="style-popover-list">
            {type === 'typography' ? (
              textStyles.map((ts) => (
                <div
                  key={ts.id}
                  className={`style-popover-item ${activeTextStyleId === ts.id ? 'active' : ''}`}
                  onClick={() => handleApplyTextStyle(ts.id)}
                >
                  <div className="style-popover-info">
                    <span className="style-popover-name">{ts.name}</span>
                    <span className="style-popover-sub">
                      {ts.fontSize}px • {ts.fontWeight}
                    </span>
                  </div>
                  {activeTextStyleId === ts.id && <Check size={12} className="text-accent" />}
                </div>
              ))
            ) : (
              <>
                <div className="style-section-title">Color Styles</div>
                {colorStyles.map((cs) => (
                  <div
                    key={cs.id}
                    className={`style-popover-item ${activeColorStyleId === cs.id ? 'active' : ''}`}
                    onClick={() => handleApplyColorStyle(cs.id)}
                  >
                    <div
                      className="style-popover-swatch"
                      style={{ backgroundColor: cs.color }}
                    />
                    <div className="style-popover-info">
                      <span className="style-popover-name">{cs.name}</span>
                      <span className="style-popover-sub">{cs.color}</span>
                    </div>
                    {activeColorStyleId === cs.id && <Check size={12} className="text-accent" />}
                  </div>
                ))}

                {variables.length > 0 && (
                  <>
                    <div className="style-section-title mt-2">Design Tokens</div>
                    {variables.map((v) => {
                      const val = Object.values(v.valuesByMode)[0];
                      return (
                        <div
                          key={v.id}
                          className={`style-popover-item ${activeVarId === v.id ? 'active' : ''}`}
                          onClick={() => handleApplyVariable(v.id)}
                        >
                          <div
                            className="style-popover-swatch"
                            style={{ backgroundColor: String(val) }}
                          />
                          <div className="style-popover-info">
                            <span className="style-popover-name">{v.name}</span>
                            <span className="style-popover-sub">{String(val)}</span>
                          </div>
                          {activeVarId === v.id && <Check size={12} className="text-accent" />}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
