import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useUIStore } from '../../state/useUIStore';
import { PrototypeRuntime, type PrototypeRuntimeState } from '../engine/prototypeRuntime';
import { DEVICE_PRESETS, type DevicePreset } from '../types';
import type { SceneObject, FrameObject, TextObject, ImageObject, RectangleObject } from '../../types/document';
import './preview.css';

export const PrototypePlayer: React.FC = () => {
  const { doc } = useDocumentStore();
  const { isPresenting, activePresentFlowId, setIsPresenting } = useUIStore();

  const [devicePreset, setDevicePreset] = useState<DevicePreset>(
    doc.prototype?.settings?.devicePreset || 'desktop'
  );
  const [showHotspotFlash, setShowHotspotFlash] = useState(false);

  // Determine initial starting frame
  const initialFrameId = useMemo(() => {
    const proto = doc.prototype;
    if (!proto) return doc.pages[0]?.objects.find((o) => o.type === 'frame')?.id || null;

    if (activePresentFlowId && proto.flows[activePresentFlowId]) {
      return proto.flows[activePresentFlowId].startingPointId;
    }

    const firstFlow = Object.values(proto.flows)[0];
    if (firstFlow) return firstFlow.startingPointId;

    // Fallback to first frame on active page
    const page = doc.pages.find((p) => p.id === doc.activePageId) || doc.pages[0];
    return page?.objects.find((o) => o.type === 'frame' || o.type === 'instance')?.id || null;
  }, [doc, activePresentFlowId]);

  // Create runtime instance
  const runtime = useMemo(() => {
    return new PrototypeRuntime(doc, initialFrameId);
  }, [doc, initialFrameId]);

  const [runtimeState, setRuntimeState] = useState<PrototypeRuntimeState>(runtime.getState());

  useEffect(() => {
    runtime.setDocument(doc);
    const unsubscribe = runtime.subscribe((newState) => {
      setRuntimeState({ ...newState });
    });
    return () => {
      unsubscribe();
      runtime.destroy();
    };
  }, [doc, runtime]);

  // Global Keyboard shortcuts
  useEffect(() => {
    if (!isPresenting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (runtimeState.activeOverlays.length > 0) {
          runtime.closeOverlay();
        } else {
          setIsPresenting(false);
        }
      } else if (e.key === 'ArrowLeft') {
        runtime.goBack();
      } else if (e.key === 'r' || e.key === 'R') {
        runtime.restart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresenting, runtimeState.activeOverlays, runtime, setIsPresenting]);

  if (!isPresenting) return null;

  const currentFrame = runtimeState.currentFrameId
    ? runtime.getScreenObject(runtimeState.currentFrameId)
    : undefined;

  const screenChildren = runtimeState.currentFrameId
    ? runtime.getScreenChildren(runtimeState.currentFrameId)
    : [];

  const flows = Object.values(doc.prototype?.flows || {});
  const currentFlow = flows.find(
    (f) => f.startingPointId === runtimeState.historyStack[0]?.frameId
  );

  const deviceDimensions = DEVICE_PRESETS[devicePreset];
  const viewportWidth = currentFrame ? currentFrame.width : deviceDimensions.width;
  const viewportHeight = currentFrame ? currentFrame.height : deviceDimensions.height;

  const handleStageClick = () => {
    // If clicked a non-interactive element, flash hotspot hints
    setShowHotspotFlash(true);
    setTimeout(() => setShowHotspotFlash(false), 800);
  };

  const renderSceneObject = (obj: SceneObject, depth = 0): React.ReactNode => {
    if (!obj.visible) return null;

    const hasInteractions = !!doc.prototype?.interactions?.[obj.id]?.length;

    const objStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${obj.x}px`,
      top: `${obj.y}px`,
      width: `${obj.width}px`,
      height: `${obj.height}px`,
      transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
      opacity: obj.opacity !== undefined ? obj.opacity / 100 : 1,
      cursor: hasInteractions ? 'pointer' : 'default',
    };

    const handleClick = (e: React.MouseEvent) => {
      if (hasInteractions) {
        e.stopPropagation();
        runtime.trigger(obj.id, 'on-click');
      }
    };

    const handleMouseEnter = () => {
      if (hasInteractions) {
        runtime.trigger(obj.id, 'while-hovering');
      }
    };

    const handleMouseDown = () => {
      if (hasInteractions) {
        runtime.trigger(obj.id, 'while-pressing');
      }
    };

    const isHotspot = showHotspotFlash && hasInteractions;
    const hotspotClass = isHotspot ? 'proto-hotspot-hint' : '';

    switch (obj.type) {
      case 'frame':
      case 'instance': {
        const frame = obj as FrameObject;
        const children = doc.pages
          .flatMap((p) => p.objects)
          .filter((child) => child.parentId === frame.id);

        return (
          <div
            key={frame.id}
            id={`proto-obj-${frame.id}`}
            className={hotspotClass}
            style={{
              ...objStyle,
              backgroundColor: frame.fill || 'transparent',
              border: frame.stroke ? `${frame.strokeWidth || 1}px solid ${frame.stroke}` : undefined,
              borderRadius: `${frame.cornerRadius || 0}px`,
              overflow: frame.clipsContent ? 'hidden' : 'visible',
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseDown={handleMouseDown}
          >
            {children.map((child) => renderSceneObject(child, depth + 1))}
          </div>
        );
      }

      case 'rectangle': {
        const rect = obj as RectangleObject;
        return (
          <div
            key={rect.id}
            id={`proto-obj-${rect.id}`}
            className={hotspotClass}
            style={{
              ...objStyle,
              backgroundColor: rect.fill || '#3b82f6',
              border: rect.stroke ? `${rect.strokeWidth || 1}px solid ${rect.stroke}` : undefined,
              borderRadius: `${rect.cornerRadius || 0}px`,
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseDown={handleMouseDown}
          />
        );
      }

      case 'ellipse': {
        const ellipse = obj as any;
        return (
          <div
            key={ellipse.id}
            id={`proto-obj-${ellipse.id}`}
            className={hotspotClass}
            style={{
              ...objStyle,
              backgroundColor: ellipse.fill || '#8b5cf6',
              border: ellipse.stroke ? `${ellipse.strokeWidth || 1}px solid ${ellipse.stroke}` : undefined,
              borderRadius: '50%',
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseDown={handleMouseDown}
          />
        );
      }

      case 'text': {
        const text = obj as TextObject;
        return (
          <div
            key={text.id}
            id={`proto-obj-${text.id}`}
            className={hotspotClass}
            style={{
              ...objStyle,
              color: text.fill || '#ffffff',
              fontSize: `${text.fontSize || 14}px`,
              fontWeight: text.fontWeight || 400,
              fontFamily: text.fontFamily || 'Inter, sans-serif',
              textAlign: text.textAlign || 'left',
              lineHeight: text.lineHeight || 1.2,
              letterSpacing: `${text.letterSpacing || 0}px`,
              whiteSpace: text.autoResize === 'auto-width' ? 'nowrap' : 'pre-wrap',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseDown={handleMouseDown}
          >
            {text.content}
          </div>
        );
      }

      case 'image': {
        const img = obj as ImageObject;
        return (
          <div
            key={img.id}
            id={`proto-obj-${img.id}`}
            className={hotspotClass}
            style={{
              ...objStyle,
              borderRadius: `${img.cornerRadius || 0}px`,
              overflow: 'hidden',
              backgroundColor: '#1e293b',
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseDown={handleMouseDown}
          >
            {img.src && (
              <img
                src={img.src}
                alt={img.name}
                style={{ width: '100%', height: '100%', objectFit: img.fit || 'cover' }}
              />
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="proto-player-overlay">
      {/* Top Floating Control Bar */}
      <div className="proto-player-toolbar">
        <div className="proto-toolbar-left">
          {flows.length > 0 ? (
            <select
              className="proto-flow-select"
              value={currentFlow?.id || flows[0]?.id}
              onChange={(e) => runtime.startFlow(e.target.value)}
            >
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  ▶ {f.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1 text-xs font-semibold text-purple-300">
              <Sparkles size={14} />
              <span>BANAVA Prototype</span>
            </div>
          )}

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Navigation Controls */}
          <button
            className="proto-tool-btn"
            disabled={runtimeState.historyStack.length <= 1}
            onClick={() => runtime.goBack()}
            title="Go Back (Left Arrow)"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            className="proto-tool-btn"
            onClick={() => runtime.restart()}
            title="Restart Flow (R)"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Center Device Viewport Selector */}
        <div className="proto-toolbar-center">
          <button
            className={`proto-tool-btn ${devicePreset === 'desktop' ? 'active' : ''}`}
            onClick={() => setDevicePreset('desktop')}
            title="Desktop 1440x900"
          >
            <Monitor size={14} />
            <span>Desktop</span>
          </button>
          <button
            className={`proto-tool-btn ${devicePreset === 'tablet' ? 'active' : ''}`}
            onClick={() => setDevicePreset('tablet')}
            title="Tablet 1024x768"
          >
            <Tablet size={14} />
            <span>Tablet</span>
          </button>
          <button
            className={`proto-tool-btn ${devicePreset === 'mobile' ? 'active' : ''}`}
            onClick={() => setDevicePreset('mobile')}
            title="Mobile 390x844"
          >
            <Smartphone size={14} />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right Exit & Fullscreen Controls */}
        <div className="proto-toolbar-right">
          <button
            className="proto-tool-btn close-btn"
            onClick={() => setIsPresenting(false)}
            title="Exit Presentation Mode (Esc)"
          >
            <X size={15} />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Main Presentation Stage Area */}
      <div className="proto-player-stage" onClick={handleStageClick}>
        {currentFrame ? (
          <div
            className={`proto-device-viewport ${devicePreset === 'mobile' ? 'mobile' : ''}`}
            style={{
              width: `${Math.min(viewportWidth, 1440)}px`,
              height: `${Math.min(viewportHeight, 900)}px`,
              backgroundColor: currentFrame.fill || '#0f131c',
            }}
          >
            <div
              key={runtimeState.currentFrameId}
              className={`proto-screen-container proto-screen-transition-wrapper ${
                runtimeState.activeTransition?.type === 'dissolve'
                  ? 'dissolve fade-in'
                  : runtimeState.activeTransition?.type === 'slide-in'
                  ? 'slide-in-right'
                  : ''
              }`}
            >
              {screenChildren.map((child) => renderSceneObject(child))}
            </div>

            {/* Modal Overlay Layer */}
            {runtimeState.activeOverlays.map((overlayItem, idx) => {
              const overlayFrame = runtime.getScreenObject(overlayItem.overlayFrameId);
              if (!overlayFrame) return null;
              const overlayChildren = runtime.getScreenChildren(overlayItem.overlayFrameId);

              return (
                <div
                  key={idx}
                  className="proto-overlay-backdrop"
                  style={{
                    backgroundColor: overlayItem.config.backdropEnabled
                      ? overlayItem.config.backdropColor || 'rgba(0,0,0,0.6)'
                      : 'transparent',
                  }}
                  onClick={(e) => {
                    if (overlayItem.config.closeOnOutsideClick) {
                      e.stopPropagation();
                      runtime.closeOverlay();
                    }
                  }}
                >
                  <div
                    className="proto-overlay-modal"
                    style={{
                      width: `${overlayFrame.width}px`,
                      height: `${overlayFrame.height}px`,
                      backgroundColor: overlayFrame.fill || '#181e2e',
                      borderRadius: `${overlayFrame.cornerRadius || 12}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {overlayChildren.map((child) => renderSceneObject(child))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <h3 className="text-lg font-semibold text-slate-200">No screen selected</h3>
            <p className="text-xs mt-1">Set a frame as starting point in the Prototype tab.</p>
          </div>
        )}
      </div>
    </div>
  );
};
