import type { DocumentModel } from '../../types/document';
import type {
  PrototypeDocumentData,
  PrototypeFlow,
  PrototypeConnection,
  PrototypeInteraction,
  PrototypeSettings,
  PrototypeTransition,
  OverlayConfig,
  ScrollConfig,
  PrototypeTrigger,
  PrototypeAction,
} from '../types';
import { generateId } from '../../utils/id';

export function createDefaultPrototypeSettings(): PrototypeSettings {
  return {
    devicePreset: 'desktop',
    customWidth: 1440,
    customHeight: 900,
    showHotspots: true,
    theme: 'dark',
  };
}

export function createDefaultPrototypeData(): PrototypeDocumentData {
  return {
    flows: {},
    connections: {},
    interactions: {},
    variables: {
      'pvar_is_logged_in': {
        id: 'pvar_is_logged_in',
        name: 'isLoggedIn',
        type: 'boolean',
        defaultValue: false,
      },
      'pvar_cart_count': {
        id: 'pvar_cart_count',
        name: 'cartCount',
        type: 'number',
        defaultValue: 0,
      },
    },
    settings: createDefaultPrototypeSettings(),
  };
}

export function addFlow(
  doc: DocumentModel,
  name: string,
  startingPointId: string,
  description?: string
): { nextDoc: DocumentModel; flowId: string } {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  const flowId = generateId('flow');
  const newFlow: PrototypeFlow = {
    id: flowId,
    name,
    startingPointId,
    description,
  };

  const nextDoc: DocumentModel = {
    ...doc,
    prototype: {
      ...currentProto,
      flows: {
        ...currentProto.flows,
        [flowId]: newFlow,
      },
    },
    updatedAt: Date.now(),
  };

  return { nextDoc, flowId };
}

export function updateFlow(
  doc: DocumentModel,
  flowId: string,
  updates: Partial<Omit<PrototypeFlow, 'id'>>
): DocumentModel {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  if (!currentProto.flows[flowId]) return doc;

  const nextDoc: DocumentModel = {
    ...doc,
    prototype: {
      ...currentProto,
      flows: {
        ...currentProto.flows,
        [flowId]: {
          ...currentProto.flows[flowId],
          ...updates,
        },
      },
    },
    updatedAt: Date.now(),
  };

  return nextDoc;
}

export function deleteFlow(doc: DocumentModel, flowId: string): DocumentModel {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  if (!currentProto.flows[flowId]) return doc;

  const nextFlows = { ...currentProto.flows };
  delete nextFlows[flowId];

  const nextDoc: DocumentModel = {
    ...doc,
    prototype: {
      ...currentProto,
      flows: nextFlows,
    },
    updatedAt: Date.now(),
  };

  return nextDoc;
}

export function duplicateFlow(doc: DocumentModel, flowId: string): { nextDoc: DocumentModel; newFlowId: string } {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  const sourceFlow = currentProto.flows[flowId];
  if (!sourceFlow) {
    return { nextDoc: doc, newFlowId: flowId };
  }

  const { nextDoc, flowId: newFlowId } = addFlow(
    doc,
    `${sourceFlow.name} (Copy)`,
    sourceFlow.startingPointId,
    sourceFlow.description
  );
  return { nextDoc, newFlowId };
}

export function setFlowStartingPoint(
  doc: DocumentModel,
  frameId: string,
  flowName = 'Flow 1'
): { nextDoc: DocumentModel; flowId: string } {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  
  // If a flow with this starting point already exists, return
  const existingFlow = (Object.values(currentProto.flows) as PrototypeFlow[]).find(
    (f: PrototypeFlow) => f.startingPointId === frameId
  );
  if (existingFlow) {
    return { nextDoc: doc, flowId: existingFlow.id };
  }

  return addFlow(doc, flowName, frameId);
}

export function addInteraction(
  doc: DocumentModel,
  interaction: Omit<PrototypeInteraction, 'id'>
): { nextDoc: DocumentModel; interactionId: string } {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  const interactionId = generateId('interact');
  const newInteraction: PrototypeInteraction = {
    ...interaction,
    id: interactionId,
  };

  const sourceId = interaction.sourceNodeId;
  const existingForSource = currentProto.interactions[sourceId] || [];

  // Also sync to connections if destination is set
  const connectionId = generateId('conn');
  const newConnection: PrototypeConnection = {
    id: connectionId,
    sourceNodeId: sourceId,
    sourceEvent: interaction.trigger,
    action: interaction.action,
    destinationNodeId: interaction.destinationNodeId,
    transition: interaction.transition,
    overlay: interaction.overlay,
    scroll: interaction.scroll,
    url: interaction.url,
    enabled: interaction.enabled,
  };

  const nextConnections = {
    ...currentProto.connections,
    ...(interaction.destinationNodeId ? { [connectionId]: newConnection } : {}),
  };

  const nextDoc: DocumentModel = {
    ...doc,
    prototype: {
      ...currentProto,
      interactions: {
        ...currentProto.interactions,
        [sourceId]: [...existingForSource, newInteraction],
      },
      connections: nextConnections,
    },
    updatedAt: Date.now(),
  };

  return { nextDoc, interactionId };
}

export function updateInteraction(
  doc: DocumentModel,
  sourceNodeId: string,
  interactionId: string,
  updates: Partial<PrototypeInteraction>
): DocumentModel {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  const list = currentProto.interactions[sourceNodeId] || [];
  const idx = list.findIndex((i: PrototypeInteraction) => i.id === interactionId);
  if (idx === -1) return doc;

  const updatedItem: PrototypeInteraction = { ...list[idx], ...updates };
  const nextList = [...list];
  nextList[idx] = updatedItem;

  // Sync connections
  const nextConnections = { ...currentProto.connections };
  for (const [cId, conn] of Object.entries(nextConnections)) {
    const typedConn = conn as PrototypeConnection;
    if (typedConn.sourceNodeId === sourceNodeId && typedConn.sourceEvent === list[idx].trigger) {
      nextConnections[cId] = {
        ...typedConn,
        sourceEvent: updatedItem.trigger,
        action: updatedItem.action,
        destinationNodeId: updatedItem.destinationNodeId,
        transition: updatedItem.transition,
        overlay: updatedItem.overlay,
        scroll: updatedItem.scroll,
        url: updatedItem.url,
        enabled: updatedItem.enabled,
      };
    }
  }

  return {
    ...doc,
    prototype: {
      ...currentProto,
      interactions: {
        ...currentProto.interactions,
        [sourceNodeId]: nextList,
      },
      connections: nextConnections,
    },
    updatedAt: Date.now(),
  };
}

export function deleteInteraction(
  doc: DocumentModel,
  sourceNodeId: string,
  interactionId: string
): DocumentModel {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  const list = currentProto.interactions[sourceNodeId] || [];
  const nextList = list.filter((i: PrototypeInteraction) => i.id !== interactionId);

  // Remove corresponding connection
  const nextConnections = { ...currentProto.connections };
  for (const [cId, conn] of Object.entries(nextConnections)) {
    const typedConn = conn as PrototypeConnection;
    if (typedConn.sourceNodeId === sourceNodeId) {
      delete nextConnections[cId];
    }
  }

  return {
    ...doc,
    prototype: {
      ...currentProto,
      interactions: {
        ...currentProto.interactions,
        [sourceNodeId]: nextList,
      },
      connections: nextConnections,
    },
    updatedAt: Date.now(),
  };
}

export function createConnection(
  doc: DocumentModel,
  sourceNodeId: string,
  destinationNodeId: string,
  trigger: PrototypeTrigger = 'on-click',
  action: PrototypeAction = 'navigate-to',
  transition: PrototypeTransition = { type: 'dissolve', duration: 300, easing: 'ease-out' },
  overlay?: OverlayConfig,
  scroll?: ScrollConfig
): { nextDoc: DocumentModel; connectionId: string } {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  const connectionId = generateId('conn');

  const newConn: PrototypeConnection = {
    id: connectionId,
    sourceNodeId,
    sourceEvent: trigger,
    action,
    destinationNodeId,
    transition,
    overlay,
    scroll,
    enabled: true,
  };

  const newInteraction: PrototypeInteraction = {
    id: generateId('interact'),
    sourceNodeId,
    trigger,
    action,
    destinationNodeId,
    transition,
    overlay,
    scroll,
    enabled: true,
  };

  const existingInteractions = currentProto.interactions[sourceNodeId] || [];

  const nextDoc: DocumentModel = {
    ...doc,
    prototype: {
      ...currentProto,
      connections: {
        ...currentProto.connections,
        [connectionId]: newConn,
      },
      interactions: {
        ...currentProto.interactions,
        [sourceNodeId]: [...existingInteractions, newInteraction],
      },
    },
    updatedAt: Date.now(),
  };

  return { nextDoc, connectionId };
}

export function deleteConnection(doc: DocumentModel, connectionId: string): DocumentModel {
  const currentProto = doc.prototype || createDefaultPrototypeData();
  if (!currentProto.connections[connectionId]) return doc;

  const targetConn = currentProto.connections[connectionId];
  const nextConns = { ...currentProto.connections };
  delete nextConns[connectionId];

  // Prune matching interaction
  const sourceInteractions = currentProto.interactions[targetConn.sourceNodeId] || [];
  const nextInteractions = sourceInteractions.filter(
    (i: PrototypeInteraction) => i.destinationNodeId !== targetConn.destinationNodeId
  );

  return {
    ...doc,
    prototype: {
      ...currentProto,
      connections: nextConns,
      interactions: {
        ...currentProto.interactions,
        [targetConn.sourceNodeId]: nextInteractions,
      },
    },
    updatedAt: Date.now(),
  };
}

export interface PrototypeValidationIssue {
  type: 'warning' | 'error';
  message: string;
  sourceNodeId?: string;
  destinationNodeId?: string;
  flowId?: string;
  connectionId?: string;
}

export function validatePrototype(doc: DocumentModel): PrototypeValidationIssue[] {
  const issues: PrototypeValidationIssue[] = [];
  const proto = doc.prototype;
  if (!proto) return issues;

  // Build lookup sets of all valid node IDs across all pages
  const validNodeIds = new Set<string>();
  for (const page of doc.pages) {
    for (const obj of page.objects) {
      validNodeIds.add(obj.id);
    }
  }

  // Validate Flows
  for (const [fId, flow] of Object.entries(proto.flows)) {
    const typedFlow = flow as PrototypeFlow;
    if (!validNodeIds.has(typedFlow.startingPointId)) {
      issues.push({
        type: 'error',
        message: `Starting point frame missing for flow "${typedFlow.name}"`,
        flowId: fId,
        destinationNodeId: typedFlow.startingPointId,
      });
    }
  }

  // Validate Connections
  for (const [cId, conn] of Object.entries(proto.connections)) {
    const typedConn = conn as PrototypeConnection;
    if (!validNodeIds.has(typedConn.sourceNodeId)) {
      issues.push({
        type: 'warning',
        message: `Source node deleted for connection`,
        connectionId: cId,
        sourceNodeId: typedConn.sourceNodeId,
      });
    }
    if (typedConn.destinationNodeId && !validNodeIds.has(typedConn.destinationNodeId)) {
      issues.push({
        type: 'warning',
        message: `Destination frame missing for connection`,
        connectionId: cId,
        destinationNodeId: typedConn.destinationNodeId,
      });
    }
    if (typedConn.action === 'open-url' && (!typedConn.url || !typedConn.url.startsWith('http'))) {
      issues.push({
        type: 'warning',
        message: `Invalid external URL on connection: ${typedConn.url || 'empty'}`,
        connectionId: cId,
      });
    }
  }

  return issues;
}
