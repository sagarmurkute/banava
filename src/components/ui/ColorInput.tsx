import React, { useState } from 'react';
import './ui.css';

interface ColorInputProps {
  value: string;
  onChange: (val: string) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
}

const PRESET_PALETTE = [
  '#6366f1',
  '#3b82f6',
  '#10b981',
  '#eab308',
  '#ec4899',
  '#8b5cf6',
  '#ffffff',
  '#000000',
  '#1e293b',
  '#64748b',
];

export const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  opacity,
  onOpacityChange,
  className = '',
}) => {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className={`color-input-wrapper-container ${className}`}>
      <div className="color-input-container">
        <div className="color-swatch-wrapper" onClick={() => setShowPresets(!showPresets)}>
          <input
            type="color"
            className="color-picker-native"
            value={value.startsWith('#') && value.length === 7 ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
          />
          <div
            className="color-swatch-preview"
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="text"
          className="color-hex-field"
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          maxLength={12}
        />
        {opacity !== undefined && onOpacityChange && (
          <div className="color-opacity-wrapper">
            <input
              type="number"
              className="color-opacity-field"
              value={opacity}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                onOpacityChange(val);
              }}
              min={0}
              max={100}
            />
            <span className="opacity-percent">%</span>
          </div>
        )}
      </div>

      {/* Preset Swatches Palette */}
      {showPresets && (
        <div className="color-presets-popover">
          <div className="color-presets-grid">
            {PRESET_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-preset-chip ${value.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => {
                  onChange(c);
                  setShowPresets(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
