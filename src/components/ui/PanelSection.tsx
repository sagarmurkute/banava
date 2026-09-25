import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './ui.css';

interface PanelSectionProps {
  title: string;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const PanelSection: React.FC<PanelSectionProps> = ({
  title,
  action,
  defaultOpen = true,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`panel-section ${className}`}>
      <div className="panel-section-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-1">
          <span className="panel-section-chevron">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="panel-section-title">{title}</span>
        </div>
        {action && (
          <div
            className="panel-section-action"
            onClick={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        )}
      </div>
      {isOpen && <div className="panel-section-content">{children}</div>}
    </div>
  );
};
