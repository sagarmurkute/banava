/**
 * Document Permissions & Collaborators Store
 */

import { create } from 'zustand';
import type { Collaborator, CollaborationRole } from '../types';
import { supabase, isSupabaseConfigured } from '../../backend/supabaseClient';
import { useAuthStore } from '../../backend/auth/useAuthStore';
import { generateId } from '../../utils/id';

interface PermissionsStoreState {
  collaborators: Collaborator[];
  currentUserRole: CollaborationRole;
  isShareModalOpen: boolean;
  isLoading: boolean;

  openShareModal: () => void;
  closeShareModal: () => void;
  loadCollaborators: (documentId: string, documentOwnerId?: string) => Promise<void>;
  inviteCollaborator: (documentId: string, email: string, role: CollaborationRole) => Promise<boolean>;
  updateCollaboratorRole: (collaboratorId: string, newRole: CollaborationRole) => Promise<boolean>;
  removeCollaborator: (collaboratorId: string) => Promise<boolean>;
}

const LOCAL_STORAGE_KEY_COLLABS = 'banava_collaborators_v8';

export const usePermissionsStore = create<PermissionsStoreState>((set, get) => ({
  collaborators: [],
  currentUserRole: 'owner',
  isShareModalOpen: false,
  isLoading: false,

  openShareModal: () => set({ isShareModalOpen: true }),
  closeShareModal: () => set({ isShareModalOpen: false }),

  loadCollaborators: async (documentId, documentOwnerId) => {
    set({ isLoading: true });
    const currentUserId = useAuthStore.getState().user?.id;

    if (!isSupabaseConfigured()) {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_COLLABS}_${documentId}`);
        if (raw) {
          try {
            const list: Collaborator[] = JSON.parse(raw);
            set({ collaborators: list, currentUserRole: 'owner', isLoading: false });
            return;
          } catch {}
        }
      }
      set({ collaborators: [], currentUserRole: 'owner', isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('document_collaborators')
        .select('*')
        .eq('document_id', documentId);

      if (error || !data) {
        set({ collaborators: [], isLoading: false });
        return;
      }

      const list: Collaborator[] = data.map((c: any) => ({
        id: c.id,
        documentId: c.document_id,
        userId: c.user_id,
        email: c.email,
        fullName: c.email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.email)}`,
        role: c.role as CollaborationRole,
        invitedBy: c.invited_by,
        createdAt: new Date(c.created_at).getTime(),
      }));

      // Determine current user's role
      let role: CollaborationRole = 'viewer';
      if (documentOwnerId && currentUserId === documentOwnerId) {
        role = 'owner';
      } else {
        const found = list.find((c) => c.userId === currentUserId || c.email === useAuthStore.getState().user?.email);
        if (found) {
          role = found.role;
        } else if (!documentOwnerId) {
          role = 'owner';
        }
      }

      set({ collaborators: list, currentUserRole: role, isLoading: false });
    } catch {
      set({ collaborators: [], isLoading: false });
    }
  },

  inviteCollaborator: async (documentId, email, role) => {
    const authUser = useAuthStore.getState().user;
    const newCollab: Collaborator = {
      id: generateId('collab'),
      documentId,
      email,
      fullName: email.split('@')[0],
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
      role,
      invitedBy: authUser?.id || null,
      createdAt: Date.now(),
    };

    const nextList = [...get().collaborators.filter((c) => c.email !== email), newCollab];
    set({ collaborators: nextList });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COLLABS}_${documentId}`, JSON.stringify(nextList));
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('document_collaborators').upsert({
          id: newCollab.id,
          document_id: documentId,
          email,
          role,
          invited_by: authUser?.id || null,
        });
        return !error;
      } catch {
        return false;
      }
    }

    return true;
  },

  updateCollaboratorRole: async (collaboratorId, newRole) => {
    const nextList = get().collaborators.map((c) =>
      c.id === collaboratorId ? { ...c, role: newRole } : c
    );
    set({ collaborators: nextList });

    const docId = get().collaborators[0]?.documentId;
    if (docId && typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COLLABS}_${docId}`, JSON.stringify(nextList));
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('document_collaborators')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', collaboratorId);
        return !error;
      } catch {
        return false;
      }
    }

    return true;
  },

  removeCollaborator: async (collaboratorId) => {
    const nextList = get().collaborators.filter((c) => c.id !== collaboratorId);
    set({ collaborators: nextList });

    const docId = get().collaborators[0]?.documentId;
    if (docId && typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COLLABS}_${docId}`, JSON.stringify(nextList));
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('document_collaborators')
          .delete()
          .eq('id', collaboratorId);
        return !error;
      } catch {
        return false;
      }
    }

    return true;
  },
}));
