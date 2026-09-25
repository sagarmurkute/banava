import React from 'react';
import './ui.css';

interface Option {
  value: string | number;
  label: string;
}

interface SelectInputProps {
  label?: string;
  value: string | number;
  options: Option[];
  onChange: (val: string) => void;
  className?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  value,
  options,
  onChange,
  className = '',
}) => {
  return (
    <div className={`select-input-container ${className}`}>
      {label && <span className="input-label-static">{label}</span>}
      <select
        className="select-input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
