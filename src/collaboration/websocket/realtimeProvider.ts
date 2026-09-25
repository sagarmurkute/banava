/**
 * Real-time Multiplayer Transport Layer
 * Combines Supabase Realtime Channels (online) with BroadcastChannel (multi-tab/offline).
 */

import { supabase, isSupabaseConfigured } from '../../backend/supabaseClient';
import { YjsManager } from '../yjs/yjsManager';
import { usePresenceStore } from '../presence/usePresenceStore';
import { useCommentsStore } from '../comments/useCommentsStore';
import type { UserPresence, CanvasComment } from '../types';
import type { DocumentModel } from '../../types/document';

export class RealtimeProvider {
  private static instance: RealtimeProvider | null = null;
  private currentDocId: string | null = null;
  private supabaseChannel: any = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private heartbeatTimer: any = null;
  private reconnectAttempts = 0;

  private constructor() {}

  public static getInstance(): RealtimeProvider {
    if (!this.instance) {
      this.instance = new RealtimeProvider();
    }
    return this.instance;
  }

  /**
   * Connect to real-time session for a document
   */
  public joinDocument(docId: string, initialDoc: DocumentModel) {
    if (this.currentDocId === docId) return;
    this.leaveDocument();
    this.currentDocId = docId;

    const presenceStore = usePresenceStore.getState();
    presenceStore.initializePresence(docId);
    presenceStore.setConnectionStatus('connecting');

    // 1. Initialize Yjs document
    const yjs = YjsManager.getInstance();
    yjs.loadDocument(initialDoc);

    // Listen to local CRDT modifications and broadcast to peers
    yjs.onLocalUpdate((updateBase64) => {
      this.broadcastYjsUpdate(updateBase64);
    });

    // 2. Setup BroadcastChannel for Instant Cross-Tab / Multi-Window Sync
    if (typeof BroadcastChannel !== 'undefined') {
      this.localBroadcastChannel = new BroadcastChannel(`banava_collab_${docId}`);
      this.localBroadcastChannel.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    }

    // 3. Setup Supabase Realtime Channel if configured
    if (isSupabaseConfigured()) {
      this.connectSupabaseRealtime(docId);
    } else {
      // Local/Offline Mode is connected immediately via BroadcastChannel
      presenceStore.setConnectionStatus('connected');
    }

    // 4. Start heartbeat presence loop (every 3 seconds)
    this.startPresenceHeartbeat();

    // 5. Broadcast initial presence & request state
    this.broadcastPresence(presenceStore.currentUserPresence);
    this.broadcastInitialHandshake();
  }

  /**
   * Disconnect from current document session
   */
  public leaveDocument() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.supabaseChannel) {
      try {
        supabase.removeChannel(this.supabaseChannel);
      } catch (err) {
        console.warn('Error removing Supabase channel:', err);
      }
      this.supabaseChannel = null;
    }

    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }

    const presenceStore = usePresenceStore.getState();
    presenceStore.clearCollaborators();
    presenceStore.setConnectionStatus('disconnected');
    this.currentDocId = null;
  }

  private connectSupabaseRealtime(docId: string) {
    try {
      const presenceStore = usePresenceStore.getState();
      const channelName = `banava_doc_${docId}`;

      this.supabaseChannel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: presenceStore.currentUserId },
        },
      });

      this.supabaseChannel
        .on('broadcast', { event: 'yjs-update' }, ({ payload }: any) => {
          this.handleIncomingMessage(payload);
        })
        .on('broadcast', { event: 'presence' }, ({ payload }: any) => {
          this.handleIncomingMessage(payload);
        })
        .on('broadcast', { event: 'comment-update' }, ({ payload }: any) => {
          this.handleIncomingMessage(payload);
        })
        .on('presence', { event: 'sync' }, () => {
          const state = this.supabaseChannel.presenceState();
          this.handlePresenceSync(state);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          for (const p of leftPresences || []) {
            presenceStore.removeCollaborator(p.userId);
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            presenceStore.setConnectionStatus('connected');
            this.reconnectAttempts = 0;
            // Track local presence
            this.supabaseChannel.track(presenceStore.currentUserPresence);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            presenceStore.setConnectionStatus('reconnecting');
            this.handleReconnect();
          }
        });
    } catch (err) {
      console.warn('Supabase realtime connection fallback to local broadcast:', err);
      usePresenceStore.getState().setConnectionStatus('connected');
    }
  }

  private handleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    setTimeout(() => {
      if (this.currentDocId && isSupabaseConfigured()) {
        this.connectSupabaseRealtime(this.currentDocId);
      }
    }, delay);
  }

  private handlePresenceSync(state: Record<string, any[]>) {
    const presenceStore = usePresenceStore.getState();
    for (const key of Object.keys(state)) {
      const presences = state[key];
      if (presences && presences.length > 0) {
        const presence = presences[0] as UserPresence;
        if (presence.userId !== presenceStore.currentUserId) {
          presenceStore.setCollaboratorPresence(presence);
        }
      }
    }
  }

  private handleIncomingMessage(msg: any) {
    if (!msg || !msg.type || msg.senderId === usePresenceStore.getState().currentUserId) {
      return;
    }

    switch (msg.type) {
      case 'yjs-update': {
        if (msg.update) {
          YjsManager.getInstance().applyRemoteUpdate(msg.update);
        }
        break;
      }
      case 'presence': {
        if (msg.presence) {
          usePresenceStore.getState().setCollaboratorPresence(msg.presence);
        }
        break;
      }
      case 'handshake-request': {
        // Send full state to newly joined peer
        const fullState = YjsManager.getInstance().getFullStateAsBase64();
        this.sendDirectMessage({
          type: 'yjs-update',
          update: fullState,
          senderId: usePresenceStore.getState().currentUserId,
        });
        break;
      }
      case 'comment-update': {
        if (msg.comment) {
          useCommentsStore.getState().upsertRemoteComment(msg.comment);
        }
        if (msg.deletedCommentId) {
          useCommentsStore.getState().deleteLocalComment(msg.deletedCommentId);
        }
        break;
      }
    }
  }

  // --- Broadcast Methods ---

  public broadcastYjsUpdate(updateBase64: string) {
    const payload = {
      type: 'yjs-update',
      update: updateBase64,
      senderId: usePresenceStore.getState().currentUserId,
    };
    this.sendDirectMessage(payload);
  }

  public broadcastPresence(presence: UserPresence) {
    const payload = {
      type: 'presence',
      presence,
      senderId: presence.userId,
    };
    this.sendDirectMessage(payload);

    if (this.supabaseChannel && isSupabaseConfigured()) {
      this.supabaseChannel.track(presence);
    }
  }

  public broadcastCommentUpdate(comment: CanvasComment) {
    const payload = {
      type: 'comment-update',
      comment,
      senderId: usePresenceStore.getState().currentUserId,
    };
    this.sendDirectMessage(payload);
  }

  public broadcastCommentDelete(commentId: string) {
    const payload = {
      type: 'comment-update',
      deletedCommentId: commentId,
      senderId: usePresenceStore.getState().currentUserId,
    };
    this.sendDirectMessage(payload);
  }

  private broadcastInitialHandshake() {
    this.sendDirectMessage({
      type: 'handshake-request',
      senderId: usePresenceStore.getState().currentUserId,
    });
  }

  private sendDirectMessage(payload: any) {
    // 1. Local BroadcastChannel
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. Supabase Realtime Channel
    if (this.supabaseChannel && isSupabaseConfigured()) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: payload.type,
          payload,
        });
      } catch (err) {
        console.warn('Supabase broadcast send error:', err);
      }
    }
  }

  private startPresenceHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      const presenceStore = usePresenceStore.getState();
      if (this.currentDocId) {
        this.broadcastPresence(presenceStore.currentUserPresence);
      }
    }, 2500);
  }
}
