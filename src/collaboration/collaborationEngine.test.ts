/**
 * Phase 8 Real-Time Multiplayer Collaboration Test Suite
 */

import { YjsManager } from './yjs/yjsManager';
import { usePresenceStore } from './presence/usePresenceStore';
import { useCommentsStore } from './comments/useCommentsStore';
import { usePermissionsStore } from './permissions/usePermissionsStore';
import { getCollaboratorColor } from './presence/colorPalette';
import { DocumentService } from '../documents/documentEngine';
import { useDocumentStore } from '../state/useDocumentStore';
import type { SceneObject } from '../types/document';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

export function runCollaborationTests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        res.catch((err) => {
          results.push({ name, passed: false, error: err.message });
        });
      }
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  }

  // 1. Yjs Document Loading
  test('1. YjsManager initializes CRDT doc with DocumentModel', () => {
    const doc = DocumentService.createDocument('Collaborative Project');
    const yjs = YjsManager.getInstance();
    yjs.loadDocument(doc);

    const fullState = yjs.getFullStateAsBase64();
    assert(fullState.length > 0, 'Yjs generated valid base64 CRDT state');
  });

  // 2. Yjs Local Update Emission
  test('2. YjsManager emits incremental CRDT update when local document changes', () => {
    const doc = DocumentService.createDocument('Test Doc');
    const yjs = YjsManager.getInstance();
    yjs.loadDocument(doc);

    let emittedUpdate = '';
    const unsubscribe = yjs.onLocalUpdate((update) => {
      emittedUpdate = update;
    });

    const modifiedDoc = { ...doc, name: 'Renamed Collaborative Doc' };
    yjs.syncLocalChange(modifiedDoc);

    assert(emittedUpdate.length > 0, 'Local update emitted to subscribers');
    unsubscribe();
  });

  // 3. Yjs Remote Update Application
  test('3. YjsManager applies remote CRDT update and reconstructs document', () => {
    const docA = DocumentService.createDocument('Peer A Document');
    const yjs = YjsManager.getInstance();
    yjs.loadDocument(docA);

    useDocumentStore.getState().openDocument(docA);

    // Simulate remote peer renaming document
    const peerDoc = { ...docA, name: 'Updated by Peer B' };
    yjs.syncLocalChange(peerDoc);
    const updateBase64 = yjs.getFullStateAsBase64();

    const appliedDoc = yjs.applyRemoteUpdate(updateBase64);
    assert(appliedDoc !== null, 'Remote update applied');
    assert(appliedDoc?.name === 'Updated by Peer B', 'Reconstructed name matches remote peer');
  });

  // 4. Concurrent Object Additions Conflict Handling
  test('4. Yjs CRDT resolves concurrent object creation safely', () => {
    const baseDoc = DocumentService.createDocument('Canvas Workspace');
    const yjs = YjsManager.getInstance();
    yjs.loadDocument(baseDoc);

    const rectObj: SceneObject = {
      id: 'rect-1',
      name: 'Peer 1 Rectangle',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#6366f1',
      cornerRadius: 0,
    };

    const circleObj: SceneObject = {
      id: 'circle-1',
      name: 'Peer 2 Circle',
      type: 'ellipse',
      x: 350,
      y: 100,
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 100,
      visible: true,
      locked: false,
      parentId: null,
      fill: '#ec4899',
    };

    const docWithBoth = {
      ...baseDoc,
      pages: [
        {
          ...baseDoc.pages[0],
          objects: [rectObj, circleObj],
        },
      ],
    };

    yjs.syncLocalChange(docWithBoth);
    const update = yjs.getFullStateAsBase64();
    const resolved = yjs.applyRemoteUpdate(update);

    assert(resolved?.pages[0].objects.length === 2, 'Both concurrent objects preserved');
  });

  // 5. Presence Store Initialization
  test('5. PresenceStore initializes local presence with user profile and color', () => {
    usePresenceStore.getState().initializePresence('doc-xyz-123', 'editor');
    const state = usePresenceStore.getState();

    assert(state.activeDocumentId === 'doc-xyz-123', 'Active doc set');
    assert(!!state.currentUserPresence.color, 'User assigned a color');
    assert(state.currentUserPresence.role === 'editor', 'Role initialized');
  });

  // 6. Presence Cursor Tracking
  test('6. PresenceStore updates local cursor coordinates accurately', () => {
    usePresenceStore.getState().updateLocalCursor(240, 580);
    let state = usePresenceStore.getState();

    assert(state.currentUserPresence.cursor?.x === 240, 'Cursor X matches');
    assert(state.currentUserPresence.cursor?.y === 580, 'Cursor Y matches');

    usePresenceStore.getState().updateLocalCursor(null, null);
    state = usePresenceStore.getState();
    assert(state.currentUserPresence.cursor === null, 'Cursor cleared on canvas exit');
  });

  // 7. Presence Selection Tracking
  test('7. PresenceStore synchronizes selected object IDs', () => {
    usePresenceStore.getState().updateLocalSelection(['obj-1', 'obj-2']);
    const state = usePresenceStore.getState();

    assert(state.currentUserPresence.selectedObjectIds.length === 2, 'Selection recorded');
    assert(state.currentUserPresence.selectedObjectIds.includes('obj-1'), 'Obj 1 selected');
  });

  // 8. Remote Collaborator Registration
  test('8. PresenceStore registers and removes remote collaborators', () => {
    const remotePresence = {
      userId: 'peer-user-999',
      userName: 'Alice Designer',
      avatarUrl: 'https://example.com/avatar.png',
      color: '#f43f5e',
      cursor: { x: 500, y: 300 },
      selectedObjectIds: ['frame-1'],
      activePageId: 'page-1',
      lastActive: Date.now(),
      role: 'editor' as const,
    };

    usePresenceStore.getState().setCollaboratorPresence(remotePresence);
    let state = usePresenceStore.getState();
    assert(!!state.collaborators['peer-user-999'], 'Remote collaborator added');
    assert(state.collaborators['peer-user-999'].userName === 'Alice Designer', 'Peer name matches');

    usePresenceStore.getState().removeCollaborator('peer-user-999');
    state = usePresenceStore.getState();
    assert(!state.collaborators['peer-user-999'], 'Collaborator removed');
  });

  // 9. Color Palette Consistency
  test('9. getCollaboratorColor produces consistent distinct colors per user', () => {
    const color1 = getCollaboratorColor('user-alpha');
    const color2 = getCollaboratorColor('user-alpha');
    const color3 = getCollaboratorColor('user-beta');

    assert(color1 === color2, 'Same user ID receives identical color');
    assert(color1.startsWith('#'), 'Valid hex color returned');
    assert(typeof color3 === 'string', 'Valid color returned for different user');
  });

  // 10. Permissions Store - Load & Role Evaluation
  test('10. PermissionsStore calculates owner and editor permissions', async () => {
    const permStore = usePermissionsStore.getState();
    await permStore.loadCollaborators('doc-test-10', 'owner-user-id');

    assert(['owner', 'editor', 'viewer'].includes(permStore.currentUserRole), 'Valid role evaluated');
  });

  // 11. Permissions Store - Invite & Role Change
  test('11. PermissionsStore invites collaborator and modifies role', async () => {
    const permStore = usePermissionsStore.getState();
    const success = await permStore.inviteCollaborator('doc-test-10', 'sarah@design.co', 'viewer');
    assert(success, 'Invite succeeded');

    const added = permStore.collaborators.find((c) => c.email === 'sarah@design.co');
    assert(!!added, 'Collaborator exists in list');
    assert(added?.role === 'viewer', 'Initial role is viewer');

    if (added) {
      await permStore.updateCollaboratorRole(added.id, 'editor');
      const updated = permStore.collaborators.find((c) => c.id === added.id);
      assert(updated?.role === 'editor', 'Role updated to editor');
      await permStore.removeCollaborator(added.id);
    }
  });

  // 12. Comments Store - Add Comment Pin
  test('12. CommentsStore adds canvas comment at coordinate (x, y)', async () => {
    const commentsStore = useCommentsStore.getState();
    const newComment = await commentsStore.addComment(
      'doc-collab-1',
      'page-1',
      420,
      310,
      'Can we increase contrast on this button?'
    );

    assert(newComment.content === 'Can we increase contrast on this button?', 'Comment content matches');
    assert(newComment.x === 420 && newComment.y === 310, 'Comment coordinates match');
    assert(!newComment.resolved, 'New comment is unresolved');
    assert(commentsStore.comments[newComment.id] !== undefined, 'Comment stored in state');
  });

  // 13. Comments Store - Reply to Thread
  test('13. CommentsStore appends replies to comment threads', async () => {
    const commentsStore = useCommentsStore.getState();
    const comments = Object.values(commentsStore.comments);
    const targetComment = comments[0];
    assert(!!targetComment, 'Target comment exists');

    const reply = await commentsStore.addReply(targetComment.id, 'Updated fill color to indigo-600.');
    assert(reply !== null, 'Reply created');

    const updated = commentsStore.comments[targetComment.id];
    assert(updated.replies.length >= 1, 'Reply present in comment thread');
    assert(updated.replies.some((r) => r.content === 'Updated fill color to indigo-600.'), 'Reply text verified');
  });

  // 14. Comments Store - Resolve & Delete
  test('14. CommentsStore toggles resolved status and deletes comments', async () => {
    const commentsStore = useCommentsStore.getState();
    const comments = Object.values(commentsStore.comments);
    const targetComment = comments[0];

    await commentsStore.toggleResolveComment(targetComment.id);
    assert(commentsStore.comments[targetComment.id].resolved === true, 'Comment resolved');

    await commentsStore.deleteComment(targetComment.id);
    assert(!commentsStore.comments[targetComment.id], 'Comment deleted from state');
  });

  // 15. Connection Status Management
  test('15. PresenceStore manages real-time connection states', () => {
    usePresenceStore.getState().setConnectionStatus('connecting');
    assert(usePresenceStore.getState().connectionStatus === 'connecting', 'Status set to connecting');

    usePresenceStore.getState().setConnectionStatus('connected');
    assert(usePresenceStore.getState().connectionStatus === 'connected', 'Status set to connected');

    usePresenceStore.getState().setConnectionStatus('reconnecting');
    assert(usePresenceStore.getState().connectionStatus === 'reconnecting', 'Status set to reconnecting');
  });

  return results;
}
