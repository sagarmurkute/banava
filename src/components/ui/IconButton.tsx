import React from 'react';
import './ui.css';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isActive?: boolean;
  tooltip?: string;
  shortcut?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  isActive = false,
  tooltip,
  shortcut,
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`icon-button size-${size} ${isActive ? 'active' : ''} ${className}`}
      title={tooltip ? (shortcut ? `${tooltip} (${shortcut})` : tooltip) : undefined}
      {...props}
    >
      {icon}
    </button>
  );
};
