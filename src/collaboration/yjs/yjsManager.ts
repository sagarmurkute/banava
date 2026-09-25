/**
 * Yjs CRDT Manager for BANAVA Real-time Document Synchronization
 */

import * as Y from 'yjs';
import type { DocumentModel } from '../../types/document';
import { useDocumentStore } from '../../state/useDocumentStore';

export class YjsManager {
  private static instance: YjsManager | null = null;
  private ydoc: Y.Doc;
  private isApplyingRemoteUpdate = false;
  private currentDocId: string | null = null;
  private onUpdateCallbacks: ((updateBase64: string) => void)[] = [];

  private constructor() {
    this.ydoc = new Y.Doc();
    this.setupListeners();
  }

  public static getInstance(): YjsManager {
    if (!this.instance) {
      this.instance = new YjsManager();
    }
    return this.instance;
  }

  private setupListeners() {
    this.ydoc.on('update', (update: Uint8Array, origin: any) => {
      // If the change came from a remote peer, do not re-broadcast
      if (origin === 'remote') return;

      const base64Update = this.uint8ArrayToBase64(update);
      for (const cb of this.onUpdateCallbacks) {
        cb(base64Update);
      }
    });
  }

  /**
   * Subscribe to local CRDT update emissions to broadcast to peers
   */
  public onLocalUpdate(callback: (updateBase64: string) => void): () => void {
    this.onUpdateCallbacks.push(callback);
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Initialize or bind Yjs Doc to an active Banava Document
   */
  public loadDocument(doc: DocumentModel) {
    if (this.currentDocId === doc.id) return;
    this.currentDocId = doc.id;

    // Reset current YDoc
    this.ydoc.destroy();
    this.ydoc = new Y.Doc();
    this.setupListeners();

    // Populate initial state inside a transaction
    this.ydoc.transact(() => {
      const yMap = this.ydoc.getMap('banava_root');
      yMap.set('document_data', JSON.stringify(doc));
    }, 'initial_load');
  }

  /**
   * Push local document changes into the Yjs CRDT document
   */
  public syncLocalChange(doc: DocumentModel) {
    if (this.isApplyingRemoteUpdate) return;

    this.ydoc.transact(() => {
      const yMap = this.ydoc.getMap('banava_root');
      yMap.set('document_data', JSON.stringify(doc));
    }, 'local_edit');
  }

  /**
   * Apply incoming binary update from remote peer (WebSocket or BroadcastChannel)
   */
  public applyRemoteUpdate(base64Update: string): DocumentModel | null {
    try {
      this.isApplyingRemoteUpdate = true;
      const binaryUpdate = this.base64ToUint8Array(base64Update);
      Y.applyUpdate(this.ydoc, binaryUpdate, 'remote');

      const yMap = this.ydoc.getMap('banava_root');
      const docJson = yMap.get('document_data') as string | undefined;

      if (docJson) {
        const updatedDoc: DocumentModel = JSON.parse(docJson);
        // Sync back to local zustand document store without pushing new Yjs cycle
        const store = useDocumentStore.getState();
        if (store.doc && store.doc.id === updatedDoc.id) {
          store.openDocument(updatedDoc);
        }
        return updatedDoc;
      }
      return null;
    } catch (err) {
      console.error('Failed to apply Yjs remote update:', err);
      return null;
    } finally {
      this.isApplyingRemoteUpdate = false;
    }
  }

  /**
   * Export the full CRDT state as base64 for initial peer handshake
   */
  public getFullStateAsBase64(): string {
    const fullState = Y.encodeStateAsUpdate(this.ydoc);
    return this.uint8ArrayToBase64(fullState);
  }

  public getDoc(): Y.Doc {
    return this.ydoc;
  }

  // --- Binary Encoding Helpers ---
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    }
    const gBuffer = (globalThis as any).Buffer;
    return gBuffer ? gBuffer.from(bytes).toString('base64') : '';
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    if (typeof atob !== 'undefined') {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    const gBuffer = (globalThis as any).Buffer;
    return gBuffer ? new Uint8Array(gBuffer.from(base64, 'base64')) : new Uint8Array(0);
  }
}
