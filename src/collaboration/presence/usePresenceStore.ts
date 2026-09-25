/**
 * Zustand Store for Live Presence, Collaborator Cursors & Selection States
 */

import { create } from 'zustand';
import type { UserPresence, CollaborationConnectionStatus, CollaborationRole } from '../types';
import { getCollaboratorColor } from './colorPalette';
import { useAuthStore } from '../../backend/auth/useAuthStore';

interface PresenceState {
  currentUserId: string;
  currentUserPresence: UserPresence;
  collaborators: Record<string, UserPresence>;
  connectionStatus: CollaborationConnectionStatus;
  activeDocumentId: string | null;

  // Actions
  initializePresence: (docId: string, role?: CollaborationRole) => void;
  updateLocalCursor: (x: number | null, y: number | null) => void;
  updateLocalSelection: (selectedObjectIds: string[]) => void;
  updateLocalActivePage: (pageId: string) => void;
  setCollaboratorPresence: (presence: UserPresence) => void;
  removeCollaborator: (userId: string) => void;
  clearCollaborators: () => void;
  setConnectionStatus: (status: CollaborationConnectionStatus) => void;
}

const getInitialUserId = () => {
  const authUser = useAuthStore.getState().user;
  if (authUser?.id) return authUser.id;
  if (typeof sessionStorage !== 'undefined') {
    let tabId = sessionStorage.getItem('banava_tab_user_id');
    if (!tabId) {
      tabId = `user_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('banava_tab_user_id', tabId);
    }
    return tabId;
  }
  return `user_${Math.random().toString(36).substring(2, 9)}`;
};

const initialUserId = getInitialUserId();
const initialColor = getCollaboratorColor(initialUserId);

export const usePresenceStore = create<PresenceState>((set, get) => ({
  currentUserId: initialUserId,
  currentUserPresence: {
    userId: initialUserId,
    userName: useAuthStore.getState().user?.fullName || 'Collaborator',
    avatarUrl:
      useAuthStore.getState().user?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initialUserId)}`,
    color: initialColor,
    cursor: null,
    selectedObjectIds: [],
    activePageId: 'page-1',
    lastActive: Date.now(),
    role: 'editor',
  },
  collaborators: {},
  connectionStatus: 'disconnected',
  activeDocumentId: null,

  initializePresence: (docId: string, role = 'editor') => {
    const auth = useAuthStore.getState();
    const userId = auth.user?.id || getInitialUserId();
    const userName = auth.user?.fullName || (auth.user?.email ? auth.user.email.split('@')[0] : 'Designer');
    const avatarUrl =
      auth.user?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}`;
    const color = getCollaboratorColor(userId);

    const presence: UserPresence = {
      userId,
      userName,
      avatarUrl,
      color,
      cursor: null,
      selectedObjectIds: [],
      activePageId: 'page-1',
      lastActive: Date.now(),
      role,
    };

    set({
      currentUserId: userId,
      currentUserPresence: presence,
      activeDocumentId: docId,
      collaborators: {},
    });
  },

  updateLocalCursor: (x, y) => {
    const { currentUserPresence } = get();
    const cursor = x === null || y === null ? null : { x, y };

    set({
      currentUserPresence: {
        ...currentUserPresence,
        cursor,
        lastActive: Date.now(),
      },
    });
  },

  updateLocalSelection: (selectedObjectIds) => {
    const { currentUserPresence } = get();
    set({
      currentUserPresence: {
        ...currentUserPresence,
        selectedObjectIds,
        lastActive: Date.now(),
      },
    });
  },

  updateLocalActivePage: (activePageId) => {
    const { currentUserPresence } = get();
    set({
      currentUserPresence: {
        ...currentUserPresence,
        activePageId,
        lastActive: Date.now(),
      },
    });
  },

  setCollaboratorPresence: (presence) => {
    const { currentUserId, collaborators } = get();
    // Do not register self as remote collaborator
    if (presence.userId === currentUserId) return;

    set({
      collaborators: {
        ...collaborators,
        [presence.userId]: {
          ...presence,
          lastActive: Date.now(),
        },
      },
    });
  },

  removeCollaborator: (userId) => {
    const { collaborators } = get();
    const newCollaborators = { ...collaborators };
    delete newCollaborators[userId];
    set({ collaborators: newCollaborators });
  },

  clearCollaborators: () => {
    set({ collaborators: {} });
  },

  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },
}));
