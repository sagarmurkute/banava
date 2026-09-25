import React, { useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { PanelSection } from '../components/ui/PanelSection';
import { SelectInput } from '../components/ui/SelectInput';
import { NumberInput } from '../components/ui/NumberInput';
import { IconButton } from '../components/ui/IconButton';
import { useDocumentStore } from '../state/useDocumentStore';
import { useUIStore } from '../state/useUIStore';
import type {
  SceneObject,
  PrototypeInteraction,
  PrototypeTrigger,
  PrototypeAction,
  TransitionType,
  TransitionEasing,
  TransitionDirection,
  OverlayPosition,
  DevicePreset,
} from '../types/document';

interface PrototypeInspectorProps {
  target?: SceneObject | null;
}

const TRIGGER_OPTIONS = [
  { value: 'on-click', label: 'On Click' },
  { value: 'on-tap', label: 'On Tap' },
  { value: 'while-hovering', label: 'While Hovering' },
  { value: 'while-pressing', label: 'While Pressing' },
  { value: 'on-drag', label: 'On Drag' },
  { value: 'on-key-press', label: 'On Key Press' },
  { value: 'after-delay', label: 'After Delay' },
];

const ACTION_OPTIONS = [
  { value: 'navigate-to', label: 'Navigate To' },
  { value: 'back', label: 'Back (Previous Screen)' },
  { value: 'open-overlay', label: 'Open Overlay' },
  { value: 'close-overlay', label: 'Close Overlay' },
  { value: 'swap-overlay', label: 'Swap Overlay' },
  { value: 'scroll-to', label: 'Scroll To' },
  { value: 'open-url', label: 'Open External URL' },
  { value: 'set-variable', label: 'Set Prototype Variable' },
];

const TRANSITION_OPTIONS = [
  { value: 'instant', label: 'Instant' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'smart-animate', label: 'Smart Animate' },
  { value: 'move-in', label: 'Move In' },
  { value: 'move-out', label: 'Move Out' },
  { value: 'push', label: 'Push' },
  { value: 'slide-in', label: 'Slide In' },
  { value: 'slide-out', label: 'Slide Out' },
];

const EASING_OPTIONS = [
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
];

const DIRECTION_OPTIONS = [
  { value: 'left', label: 'Left (←)' },
  { value: 'right', label: 'Right (→)' },
  { value: 'top', label: 'Top (↑)' },
  { value: 'bottom', label: 'Bottom (↓)' },
];

const OVERLAY_POS_OPTIONS = [
  { value: 'center', label: 'Center Modal' },
  { value: 'top', label: 'Top Drawer' },
  { value: 'bottom', label: 'Bottom Sheet' },
  { value: 'left', label: 'Left Sidebar' },
  { value: 'right', label: 'Right Panel' },
  { value: 'manual', label: 'Custom Coordinate' },
];

const DEVICE_OPTIONS = [
  { value: 'desktop', label: 'Desktop (1440 × 900)' },
  { value: 'tablet', label: 'Tablet (1024 × 768)' },
  { value: 'mobile', label: 'iPhone 15 (390 × 844)' },
  { value: 'custom', label: 'Custom Size' },
];

export const PrototypeInspector: React.FC<PrototypeInspectorProps> = ({ target }) => {
  const {
    doc,
    deleteFlow,
    setStartingPoint,
    addInteraction,
    updateInteraction,
    deleteInteraction,
    updatePrototypeSettings,
  } = useDocumentStore();
  const { setIsPresenting } = useUIStore();

  const [expandedInteractionId, setExpandedInteractionId] = useState<string | null>(null);

  const proto = doc.prototype;
  const flows = Object.values(proto?.flows || {});
  const settings = proto?.settings || {
    devicePreset: 'desktop',
    customWidth: 1440,
    customHeight: 900,
    showHotspots: true,
    theme: 'dark',
  };

  // Collect all frame destinations across all pages
  const allFrames: { value: string; label: string }[] = [];
  doc.pages.forEach((page) => {
    page.objects.forEach((obj) => {
      if (obj.type === 'frame' || obj.type === 'instance') {
        allFrames.push({
          value: obj.id,
          label: `${obj.name} (${page.name})`,
        });
      }
    });
  });

  const isTargetFrame = target && (target.type === 'frame' || target.type === 'instance');
  const targetInteractions: PrototypeInteraction[] = target
    ? proto?.interactions?.[target.id] || []
    : [];

  const startingFlowForTarget = isTargetFrame
    ? flows.find((f) => f.startingPointId === target.id)
    : undefined;

  const handleAddInteraction = () => {
    if (!target) return;
    const firstDest = allFrames.find((f) => f.value !== target.id)?.value || target.id;
    const newId = addInteraction({
      sourceNodeId: target.id,
      trigger: 'on-click',
      action: 'navigate-to',
      destinationNodeId: firstDest,
      transition: {
        type: 'dissolve',
        duration: 300,
        easing: 'ease-out',
      },
      enabled: true,
    });
    setExpandedInteractionId(newId);
  };

  const handleSetStartingPoint = () => {
    if (!target) return;
    setStartingPoint(target.id, `${target.name} Flow`);
  };

  const handleRemoveStartingPoint = (flowId: string) => {
    deleteFlow(flowId);
  };

  return (
    <div className="prototype-inspector-container">
      {/* Top Flow & Present Launcher */}
      <div className="proto-present-bar">
        <button
          className="proto-present-btn primary"
          onClick={() => setIsPresenting(true, flows[0]?.id)}
        >
          <Play size={14} />
          <span>Present Prototype</span>
        </button>
      </div>

      {/* Starting Point & Flows Section */}
      <PanelSection title="Flow Starting Point">
        {isTargetFrame ? (
          <div className="proto-flow-item">
            {startingFlowForTarget ? (
              <div className="flex items-center justify-between p-2 rounded bg-purple-950/40 border border-purple-800/50">
                <div className="flex items-center gap-2">
                  <Play size={14} className="text-purple-400" />
                  <div>
                    <div className="text-xs font-semibold text-purple-200">
                      {startingFlowForTarget.name}
                    </div>
                    <div className="text-[11px] text-purple-400/80">Flow Starting Point</div>
                  </div>
                </div>
                <IconButton
                  icon={<Trash2 size={13} />}
                  size="sm"
                  tooltip="Remove starting point"
                  onClick={() => handleRemoveStartingPoint(startingFlowForTarget.id)}
                />
              </div>
            ) : (
              <button
                className="w-full py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium rounded bg-surface-200 hover:bg-surface-300 text-text-primary border border-border-subtle"
                onClick={handleSetStartingPoint}
              >
                <Plus size={13} />
                <span>Set as Flow Starting Point</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-text-secondary py-1">
            Select a frame on the canvas to set it as a flow starting point.
          </div>
        )}

        {/* Existing Flows List */}
        {flows.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Document Flows ({flows.length})
            </span>
            {flows.map((flow) => {
              const startFrame = doc.pages
                .flatMap((p) => p.objects)
                .find((o) => o.id === flow.startingPointId);
              return (
                <div
                  key={flow.id}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-surface-200 text-xs text-text-primary border border-transparent hover:border-border-subtle"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Play size={12} className="text-purple-400 flex-shrink-0" />
                    <span className="font-medium truncate">{flow.name}</span>
                    <span className="text-[10px] text-text-secondary truncate">
                      → {startFrame?.name || 'Missing frame'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={<Play size={12} />}
                      size="sm"
                      tooltip="Play this flow"
                      onClick={() => setIsPresenting(true, flow.id)}
                    />
                    <IconButton
                      icon={<Trash2 size={12} />}
                      size="sm"
                      tooltip="Delete flow"
                      onClick={() => deleteFlow(flow.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>

      {/* Target Node Interactions Section */}
      <PanelSection
        title={`Interactions ${target ? `(${targetInteractions.length})` : ''}`}
        action={
          target && (
            <IconButton
              icon={<Plus size={14} />}
              size="sm"
              tooltip="Add Interaction"
              onClick={handleAddInteraction}
            />
          )
        }
      >
        {!target ? (
          <div className="text-xs text-text-secondary py-2">
            Select an object or frame on the canvas to add prototype interactions.
          </div>
        ) : targetInteractions.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-secondary">
            <span>No interactions on this object.</span>
            <button
              className="mt-2 block mx-auto py-1 px-3 text-xs font-medium rounded bg-accent text-white hover:bg-accent-hover"
              onClick={handleAddInteraction}
            >
              + Add Interaction
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {targetInteractions.map((interact, idx) => {
              const isExpanded =
                expandedInteractionId === interact.id || targetInteractions.length === 1;
              const destObj = allFrames.find((f) => f.value === interact.destinationNodeId);

              return (
                <div
                  key={interact.id || idx}
                  className="rounded border border-border-subtle bg-surface-100 overflow-hidden"
                >
                  {/* Summary Bar */}
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-surface-200"
                    onClick={() =>
                      setExpandedInteractionId(isExpanded ? null : interact.id)
                    }
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <span className="text-accent font-semibold capitalize">
                        {interact.trigger.replace(/-/g, ' ')}
                      </span>
                      <ArrowRight size={11} className="text-text-muted" />
                      <span className="text-text-primary truncate">
                        {interact.action === 'navigate-to'
                          ? destObj?.label || 'Select Frame'
                          : interact.action.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        icon={<Trash2 size={13} />}
                        size="sm"
                        tooltip="Delete interaction"
                        onClick={() => deleteInteraction(target.id, interact.id)}
                      />
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {isExpanded && (
                    <div className="p-3 border-t border-border-subtle bg-surface-50 space-y-3">
                      {/* Trigger selector */}
                      <div className="inspector-field-group">
                        <span className="field-label">Trigger</span>
                        <SelectInput
                          value={interact.trigger}
                          options={TRIGGER_OPTIONS}
                          onChange={(val) =>
                            updateInteraction(target.id, interact.id, {
                              trigger: val as PrototypeTrigger,
                            })
                          }
                        />
                      </div>

                      {/* After Delay milliseconds input */}
                      {interact.trigger === 'after-delay' && (
                        <div className="inspector-field-group">
                          <span className="field-label">Delay (ms)</span>
                          <NumberInput
                            value={interact.delayMs || 1000}
                            onChange={(val) =>
                              updateInteraction(target.id, interact.id, {
                                delayMs: Math.max(0, val),
                              })
                            }
                            min={0}
                            max={10000}
                            step={100}
                            suffix="ms"
                          />
                        </div>
                      )}

                      {/* Action selector */}
                      <div className="inspector-field-group">
                        <span className="field-label">Action</span>
                        <SelectInput
                          value={interact.action}
                          options={ACTION_OPTIONS}
                          onChange={(val) =>
                            updateInteraction(target.id, interact.id, {
                              action: val as PrototypeAction,
                            })
                          }
                        />
                      </div>

                      {/* Destination Frame Picker */}
                      {(interact.action === 'navigate-to' ||
                        interact.action === 'open-overlay' ||
                        interact.action === 'swap-overlay' ||
                        interact.action === 'scroll-to') && (
                        <div className="inspector-field-group">
                          <span className="field-label">Destination Frame</span>
                          <SelectInput
                            value={interact.destinationNodeId || ''}
                            options={allFrames}
                            onChange={(val) =>
                              updateInteraction(target.id, interact.id, {
                                destinationNodeId: val,
                              })
                            }
                          />
                        </div>
                      )}

                      {/* External URL Input */}
                      {interact.action === 'open-url' && (
                        <div className="inspector-field-group">
                          <span className="field-label">External URL</span>
                          <input
                            type="url"
                            className="inspector-text-input"
                            placeholder="https://example.com"
                            value={interact.url || ''}
                            onChange={(e) =>
                              updateInteraction(target.id, interact.id, {
                                url: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}

                      {/* Animation / Transition Settings */}
                      {(interact.action === 'navigate-to' ||
                        interact.action === 'open-overlay' ||
                        interact.action === 'swap-overlay') && (
                        <div className="border-t border-border-subtle pt-2 mt-2 space-y-2">
                          <span className="text-[11px] font-semibold text-text-muted uppercase">
                            Transition
                          </span>
                          <div className="inspector-field-group">
                            <span className="field-label">Animation</span>
                            <SelectInput
                              value={interact.transition?.type || 'dissolve'}
                              options={TRANSITION_OPTIONS}
                              onChange={(val) =>
                                updateInteraction(target.id, interact.id, {
                                  transition: {
                                    ...(interact.transition || {
                                      duration: 300,
                                      easing: 'ease-out',
                                    }),
                                    type: val as TransitionType,
                                  },
                                })
                              }
                            />
                          </div>

                          {interact.transition?.type !== 'instant' && (
                            <>
                              <div className="inspector-row-2col">
                                <SelectInput
                                  value={interact.transition?.easing || 'ease-out'}
                                  options={EASING_OPTIONS}
                                  onChange={(val) =>
                                    updateInteraction(target.id, interact.id, {
                                      transition: {
                                        ...interact.transition!,
                                        easing: val as TransitionEasing,
                                      },
                                    })
                                  }
                                />
                                <NumberInput
                                  value={interact.transition?.duration || 300}
                                  onChange={(val) =>
                                    updateInteraction(target.id, interact.id, {
                                      transition: {
                                        ...interact.transition!,
                                        duration: Math.max(50, Math.min(5000, val)),
                                      },
                                    })
                                  }
                                  min={50}
                                  max={5000}
                                  step={50}
                                  suffix="ms"
                                />
                              </div>

                              {interact.transition?.type?.includes('slide') ||
                              interact.transition?.type?.includes('move') ||
                              interact.transition?.type === 'push' ? (
                                <div className="inspector-field-group">
                                  <span className="field-label">Direction</span>
                                  <SelectInput
                                    value={interact.transition?.direction || 'left'}
                                    options={DIRECTION_OPTIONS}
                                    onChange={(val) =>
                                      updateInteraction(target.id, interact.id, {
                                        transition: {
                                          ...interact.transition!,
                                          direction: val as TransitionDirection,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}

                      {/* Overlay Settings */}
                      {(interact.action === 'open-overlay' ||
                        interact.action === 'swap-overlay') && (
                        <div className="border-t border-border-subtle pt-2 mt-2 space-y-2">
                          <span className="text-[11px] font-semibold text-text-muted uppercase">
                            Overlay Settings
                          </span>
                          <div className="inspector-field-group">
                            <span className="field-label">Position</span>
                            <SelectInput
                              value={interact.overlay?.position || 'center'}
                              options={OVERLAY_POS_OPTIONS}
                              onChange={(val) =>
                                updateInteraction(target.id, interact.id, {
                                  overlay: {
                                    backdropEnabled: true,
                                    backdropColor: 'rgba(0,0,0,0.6)',
                                    backdropOpacity: 60,
                                    closeOnOutsideClick: true,
                                    closeOnEscape: true,
                                    ...interact.overlay,
                                    position: val as OverlayPosition,
                                  },
                                })
                              }
                            />
                          </div>

                          <label className="inspector-checkbox-label">
                            <input
                              type="checkbox"
                              checked={interact.overlay?.closeOnOutsideClick ?? true}
                              onChange={(e) =>
                                updateInteraction(target.id, interact.id, {
                                  overlay: {
                                    backdropEnabled: true,
                                    backdropColor: 'rgba(0,0,0,0.6)',
                                    backdropOpacity: 60,
                                    closeOnEscape: true,
                                    position: 'center',
                                    ...interact.overlay,
                                    closeOnOutsideClick: e.target.checked,
                                  },
                                })
                              }
                            />
                            <span>Close when clicking outside</span>
                          </label>

                          <label className="inspector-checkbox-label">
                            <input
                              type="checkbox"
                              checked={interact.overlay?.backdropEnabled ?? true}
                              onChange={(e) =>
                                updateInteraction(target.id, interact.id, {
                                  overlay: {
                                    backdropColor: 'rgba(0,0,0,0.6)',
                                    backdropOpacity: 60,
                                    closeOnOutsideClick: true,
                                    closeOnEscape: true,
                                    position: 'center',
                                    ...interact.overlay,
                                    backdropEnabled: e.target.checked,
                                  },
                                })
                              }
                            />
                            <span>Add background backdrop</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PanelSection>

      {/* Device & Prototype Viewport Settings */}
      <PanelSection title="Prototype Viewport Preset">
        <div className="inspector-field-group">
          <span className="field-label">Device Preset</span>
          <SelectInput
            value={settings.devicePreset}
            options={DEVICE_OPTIONS}
            onChange={(val) =>
              updatePrototypeSettings({ devicePreset: val as DevicePreset })
            }
          />
        </div>

        {settings.devicePreset === 'custom' && (
          <div className="inspector-row-2col mt-2">
            <NumberInput
              label="W"
              value={settings.customWidth}
              onChange={(val) => updatePrototypeSettings({ customWidth: Math.max(200, val) })}
              min={200}
              max={3840}
            />
            <NumberInput
              label="H"
              value={settings.customHeight}
              onChange={(val) => updatePrototypeSettings({ customHeight: Math.max(200, val) })}
              min={200}
              max={2160}
            />
          </div>
        )}

        <div className="mt-2">
          <label className="inspector-checkbox-label">
            <input
              type="checkbox"
              checked={settings.showHotspots}
              onChange={(e) => updatePrototypeSettings({ showHotspots: e.target.checked })}
            />
            <span>Show interaction hotspot hints on click</span>
          </label>
        </div>
      </PanelSection>
    </div>
  );
};
