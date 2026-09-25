import React, { useState, useEffect, useRef } from 'react';
import './ui.css';

interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  className = '',
}) => {
  const [localText, setLocalText] = useState(String(Math.round(value * 100) / 100));
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, val: value });

  useEffect(() => {
    setLocalText(String(Math.round(value * 100) / 100));
  }, [value]);

  const commitValue = (textVal: string) => {
    let num = parseFloat(textVal);
    if (isNaN(num)) {
      setLocalText(String(value));
      return;
    }
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setLocalText(String(Math.round(num * 100) / 100));
    onChange(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(localText);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : step;
      let next = value + delta;
      if (max !== undefined) next = Math.min(max, next);
      onChange(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : step;
      let next = value - delta;
      if (min !== undefined) next = Math.max(min, next);
      onChange(next);
    }
  };

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startPosRef.current = { x: e.clientX, val: value };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - startPosRef.current.x;
      const multiplier = ev.shiftKey ? 10 : 1;
      let newVal = startPosRef.current.val + Math.round(dx * multiplier * step);
      if (min !== undefined) newVal = Math.max(min, newVal);
      if (max !== undefined) newVal = Math.min(max, newVal);
      onChange(newVal);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={`number-input-container ${className}`}>
      {label && (
        <span
          className="input-label-scrub"
          onMouseDown={handleLabelMouseDown}
          title="Click and drag to scrub"
        >
          {label}
        </span>
      )}
      <input
        type="text"
        className="number-input-field"
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={() => commitValue(localText)}
        onKeyDown={handleKeyDown}
      />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
  );
};
