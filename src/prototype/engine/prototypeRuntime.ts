import type { DocumentModel, SceneObject, FrameObject } from '../../types/document';
import type {
  PrototypeInteraction,
  PrototypeTrigger,
  PrototypeTransition,
  OverlayConfig,
} from '../types';

export interface HistoryEntry {
  frameId: string;
  timestamp: number;
}

export interface ActiveOverlay {
  overlayFrameId: string;
  config: OverlayConfig;
}

export interface PrototypeRuntimeState {
  currentFrameId: string | null;
  historyStack: HistoryEntry[];
  activeOverlays: ActiveOverlay[];
  variableValues: Record<string, any>;
  transitioning: boolean;
  previousFrameId: string | null;
  activeTransition: PrototypeTransition | null;
}

export class PrototypeRuntime {
  private doc: DocumentModel;
  private state: PrototypeRuntimeState;
  private listeners: ((state: PrototypeRuntimeState) => void)[] = [];
  private delayTimers: number[] = [];

  constructor(doc: DocumentModel, initialFrameId: string | null = null) {
    this.doc = doc;
    
    // Initialize variables
    const initVars: Record<string, any> = {};
    if (doc.prototype?.variables) {
      for (const [id, v] of Object.entries(doc.prototype.variables)) {
        initVars[id] = (v as any).defaultValue;
      }
    }

    this.state = {
      currentFrameId: initialFrameId,
      historyStack: initialFrameId ? [{ frameId: initialFrameId, timestamp: Date.now() }] : [],
      activeOverlays: [],
      variableValues: initVars,
      transitioning: false,
      previousFrameId: null,
      activeTransition: null,
    };

    if (initialFrameId) {
      this.checkAfterDelayTriggers(initialFrameId);
    }
  }

  public subscribe(listener: (state: PrototypeRuntimeState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public getState(): PrototypeRuntimeState {
    return this.state;
  }

  public setDocument(doc: DocumentModel) {
    this.doc = doc;
  }

  public navigateTo(destinationFrameId: string, transition: PrototypeTransition = { type: 'dissolve', duration: 300, easing: 'ease-out' }) {
    if (!destinationFrameId || destinationFrameId === this.state.currentFrameId) return;

    this.clearTimers();

    const prevFrameId = this.state.currentFrameId;
    const isInstant = transition.type === 'instant' || transition.duration === 0;

    this.state = {
      ...this.state,
      currentFrameId: destinationFrameId,
      previousFrameId: prevFrameId,
      transitioning: !isInstant,
      activeTransition: transition,
      historyStack: [...this.state.historyStack, { frameId: destinationFrameId, timestamp: Date.now() }],
      // Close open overlays on screen change unless configured otherwise
      activeOverlays: [],
    };
    this.notify();

    if (!isInstant) {
      setTimeout(() => {
        this.state = {
          ...this.state,
          transitioning: false,
          previousFrameId: null,
          activeTransition: null,
        };
        this.notify();
      }, transition.duration);
    }

    this.checkAfterDelayTriggers(destinationFrameId);
  }

  public goBack() {
    if (this.state.historyStack.length <= 1) return;

    this.clearTimers();

    const newStack = [...this.state.historyStack];
    newStack.pop(); // Remove current screen
    const targetEntry = newStack[newStack.length - 1];

    const prevFrameId = this.state.currentFrameId;
    const defaultBackTransition: PrototypeTransition = {
      type: 'slide-out',
      direction: 'right',
      duration: 250,
      easing: 'ease-out',
    };

    this.state = {
      ...this.state,
      currentFrameId: targetEntry.frameId,
      previousFrameId: prevFrameId,
      transitioning: true,
      activeTransition: defaultBackTransition,
      historyStack: newStack,
      activeOverlays: [],
    };
    this.notify();

    setTimeout(() => {
      this.state = {
        ...this.state,
        transitioning: false,
        previousFrameId: null,
        activeTransition: null,
      };
      this.notify();
    }, 250);

    this.checkAfterDelayTriggers(targetEntry.frameId);
  }

  public openOverlay(
    overlayFrameId: string,
    config: OverlayConfig = {
      position: 'center',
      backdropEnabled: true,
      backdropColor: '#000000',
      backdropOpacity: 50,
      closeOnOutsideClick: true,
      closeOnEscape: true,
    }
  ) {
    // Avoid duplicate overlays
    if (this.state.activeOverlays.some((o: ActiveOverlay) => o.overlayFrameId === overlayFrameId)) return;

    this.state = {
      ...this.state,
      activeOverlays: [...this.state.activeOverlays, { overlayFrameId, config }],
    };
    this.notify();
  }

  public closeOverlay(overlayFrameId?: string) {
    if (this.state.activeOverlays.length === 0) return;

    if (!overlayFrameId) {
      // Close topmost
      const next = [...this.state.activeOverlays];
      next.pop();
      this.state = { ...this.state, activeOverlays: next };
    } else {
      this.state = {
        ...this.state,
        activeOverlays: this.state.activeOverlays.filter(
          (o: ActiveOverlay) => o.overlayFrameId !== overlayFrameId
        ),
      };
    }
    this.notify();
  }

  public swapOverlay(newOverlayFrameId: string, config?: OverlayConfig) {
    if (this.state.activeOverlays.length === 0) {
      this.openOverlay(newOverlayFrameId, config);
      return;
    }

    const currentTop = this.state.activeOverlays[this.state.activeOverlays.length - 1];
    const finalConfig = config || currentTop.config;
    const nextOverlays = [...this.state.activeOverlays.slice(0, -1), { overlayFrameId: newOverlayFrameId, config: finalConfig }];

    this.state = {
      ...this.state,
      activeOverlays: nextOverlays,
    };
    this.notify();
  }

  public scrollTo(targetNodeId: string) {
    // In DOM-based preview, we emit a scroll-to event for the active frame container
    const el = document.getElementById(`proto-node-${targetNodeId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  public reset(startingFrameId: string | null = null) {
    this.clearTimers();
    const frameId = startingFrameId || this.state.historyStack[0]?.frameId || null;
    
    const initVars: Record<string, any> = {};
    if (this.doc.prototype?.variables) {
      for (const [id, v] of Object.entries(this.doc.prototype.variables)) {
        initVars[id] = (v as any).defaultValue;
      }
    }

    this.state = {
      currentFrameId: frameId,
      historyStack: frameId ? [{ frameId, timestamp: Date.now() }] : [],
      activeOverlays: [],
      variableValues: initVars,
      transitioning: false,
      previousFrameId: null,
      activeTransition: null,
    };
    this.notify();

    if (frameId) {
      this.checkAfterDelayTriggers(frameId);
    }
  }

  public restart(startingFrameId: string | null = null) {
    this.reset(startingFrameId);
  }

  public startFlow(flowId: string) {
    const flow = this.doc.prototype?.flows?.[flowId];
    if (flow) {
      this.reset(flow.startingPointId);
    }
  }

  private clearTimers() {
    for (const t of this.delayTimers) {
      clearTimeout(t);
    }
    this.delayTimers = [];
  }

  public setVariable(varId: string, op: 'set' | 'toggle' | 'increment' | 'decrement', val: any) {
    const current = this.state.variableValues[varId];
    let nextVal = val;
    if (op === 'toggle') nextVal = !current;
    if (op === 'increment') nextVal = (Number(current) || 0) + (Number(val) || 1);
    if (op === 'decrement') nextVal = (Number(current) || 0) - (Number(val) || 1);

    this.state = {
      ...this.state,
      variableValues: {
        ...this.state.variableValues,
        [varId]: nextVal,
      },
    };
    this.notify();
  }

  public trigger(sourceNodeId: string, trigger: PrototypeTrigger): boolean {
    const interactions = this.doc.prototype?.interactions?.[sourceNodeId] || [];
    const matching = interactions.filter((i: PrototypeInteraction) => i.enabled && i.trigger === trigger);

    if (matching.length === 0) return false;

    for (const interact of matching) {
      this.executeAction(interact);
    }
    return true;
  }

  private executeAction(interact: PrototypeInteraction) {
    switch (interact.action) {
      case 'navigate-to':
        if (interact.destinationNodeId) {
          this.navigateTo(
            interact.destinationNodeId,
            interact.transition || { type: 'dissolve', duration: 300, easing: 'ease-out' }
          );
        }
        break;

      case 'back':
        this.goBack();
        break;

      case 'open-overlay':
        if (interact.destinationNodeId) {
          this.openOverlay(interact.destinationNodeId, interact.overlay);
        }
        break;

      case 'close-overlay':
        this.closeOverlay();
        break;

      case 'swap-overlay':
        if (interact.destinationNodeId) {
          this.swapOverlay(interact.destinationNodeId, interact.overlay);
        }
        break;

      case 'scroll-to':
        if (interact.destinationNodeId || interact.scroll?.scrollToTargetId) {
          this.scrollTo(interact.scroll?.scrollToTargetId || interact.destinationNodeId!);
        }
        break;

      case 'open-url':
        if (interact.url) {
          window.open(interact.url, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'set-variable':
        if (interact.variableUpdates) {
          for (const u of interact.variableUpdates) {
            this.setVariable(u.variableId, u.operation, u.value);
          }
        }
        break;
    }
  }

  private checkAfterDelayTriggers(frameId: string) {
    const interactions = this.doc.prototype?.interactions?.[frameId] || [];
    const delayInteractions = interactions.filter(
      (i: PrototypeInteraction) => i.enabled && i.trigger === 'after-delay'
    );

    for (const interact of delayInteractions) {
      const delay = Math.max(0, interact.delayMs || 1000);
      const timer = window.setTimeout(() => {
        if (this.state.currentFrameId === frameId) {
          this.executeAction(interact);
        }
      }, delay);
      this.delayTimers.push(timer);
    }
  }

  public getScreenObject(frameId: string): FrameObject | undefined {
    for (const page of this.doc.pages) {
      const found = page.objects.find((o: SceneObject) => o.id === frameId);
      if (found && (found.type === 'frame' || found.type === 'instance')) {
        return found as FrameObject;
      }
    }
    return undefined;
  }

  public getScreenChildren(frameId: string): SceneObject[] {
    for (const page of this.doc.pages) {
      const hasFrame = page.objects.some((o: SceneObject) => o.id === frameId);
      if (hasFrame) {
        return page.objects.filter((o: SceneObject) => o.parentId === frameId);
      }
    }
    return [];
  }

  public destroy() {
    this.clearTimers();
    this.listeners = [];
  }
}
