import React from 'react';
import { PanelSection } from '../components/ui/PanelSection';
import { SelectInput } from '../components/ui/SelectInput';
import type { SceneObject, ConstraintHorizontal, ConstraintVertical } from '../types/document';
import { useDocumentStore } from '../state/useDocumentStore';

interface ConstraintsInspectorProps {
  target: SceneObject;
}

const HORIZONTAL_OPTIONS: { value: ConstraintHorizontal; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'left-right', label: 'Left & Right' },
  { value: 'center', label: 'Center' },
  { value: 'scale', label: 'Scale' },
];

const VERTICAL_OPTIONS: { value: ConstraintVertical; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'top-bottom', label: 'Top & Bottom' },
  { value: 'center', label: 'Center' },
  { value: 'scale', label: 'Scale' },
];

export const ConstraintsInspector: React.FC<ConstraintsInspectorProps> = ({ target }) => {
  const { updateObject } = useDocumentStore();

  const constraints = target.constraints || {
    horizontal: 'left',
    vertical: 'top',
  };

  const handleHorizontalChange = (val: string) => {
    updateObject(
      target.id,
      {
        constraints: {
          ...constraints,
          horizontal: val as ConstraintHorizontal,
        },
      },
      true
    );
  };

  const handleVerticalChange = (val: string) => {
    updateObject(
      target.id,
      {
        constraints: {
          ...constraints,
          vertical: val as ConstraintVertical,
        },
      },
      true
    );
  };

  return (
    <PanelSection title="Constraints">
      <div className="constraints-inspector-container">
        {/* Interactive 2D Visual Pin Box */}
        <div className="constraints-visual-box">
          <div className="constraints-outer-frame">
            {/* Top pin line */}
            <div
              className={`constraint-pin-line pin-top ${
                constraints.vertical === 'top' || constraints.vertical === 'top-bottom'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const nextV: ConstraintVertical =
                  constraints.vertical === 'top'
                    ? 'bottom'
                    : constraints.vertical === 'bottom'
                    ? 'top-bottom'
                    : constraints.vertical === 'top-bottom'
                    ? 'center'
                    : 'top';
                handleVerticalChange(nextV);
              }}
              title="Toggle Top Constraint"
            />
            {/* Bottom pin line */}
            <div
              className={`constraint-pin-line pin-bottom ${
                constraints.vertical === 'bottom' || constraints.vertical === 'top-bottom'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const nextV: ConstraintVertical =
                  constraints.vertical === 'bottom'
                    ? 'top'
                    : constraints.vertical === 'top'
                    ? 'top-bottom'
                    : 'bottom';
                handleVerticalChange(nextV);
              }}
              title="Toggle Bottom Constraint"
            />
            {/* Left pin line */}
            <div
              className={`constraint-pin-line pin-left ${
                constraints.horizontal === 'left' || constraints.horizontal === 'left-right'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const nextH: ConstraintHorizontal =
                  constraints.horizontal === 'left'
                    ? 'right'
                    : constraints.horizontal === 'right'
                    ? 'left-right'
                    : constraints.horizontal === 'left-right'
                    ? 'center'
                    : 'left';
                handleHorizontalChange(nextH);
              }}
              title="Toggle Left Constraint"
            />
            {/* Right pin line */}
            <div
              className={`constraint-pin-line pin-right ${
                constraints.horizontal === 'right' || constraints.horizontal === 'left-right'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const nextH: ConstraintHorizontal =
                  constraints.horizontal === 'right'
                    ? 'left'
                    : constraints.horizontal === 'left'
                    ? 'left-right'
                    : 'right';
                handleHorizontalChange(nextH);
              }}
              title="Toggle Right Constraint"
            />

            {/* Inner child representation */}
            <div className="constraints-inner-object">
              {constraints.horizontal === 'center' && (
                <div className="constraint-center-indicator h-center" />
              )}
              {constraints.vertical === 'center' && (
                <div className="constraint-center-indicator v-center" />
              )}
            </div>
          </div>
        </div>

        {/* Dropdown selectors */}
        <div className="constraints-dropdowns">
          <div className="inspector-field-group">
            <span className="field-label">Horizontal</span>
            <SelectInput
              value={constraints.horizontal}
              options={HORIZONTAL_OPTIONS}
              onChange={handleHorizontalChange}
            />
          </div>
          <div className="inspector-field-group">
            <span className="field-label">Vertical</span>
            <SelectInput
              value={constraints.vertical}
              options={VERTICAL_OPTIONS}
              onChange={handleVerticalChange}
            />
          </div>
        </div>
      </div>
    </PanelSection>
  );
};
