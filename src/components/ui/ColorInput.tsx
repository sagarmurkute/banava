import React from 'react';
import './ui.css';

interface ColorInputProps {
  value: string;
  onChange: (val: string) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
}

export const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  opacity,
  onOpacityChange,
  className = '',
}) => {
  return (
    <div className={`color-input-container ${className}`}>
      <div className="color-swatch-wrapper">
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
        maxLength={9}
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
  );
};
