/**
 * Canvas Comments Zustand Store & Persistence Service
 */

import { create } from 'zustand';
import type { CanvasComment, CommentReply } from '../types';
import { useAuthStore } from '../../backend/auth/useAuthStore';
import { supabase, isSupabaseConfigured } from '../../backend/supabaseClient';
import { RealtimeProvider } from '../websocket/realtimeProvider';
import { generateId } from '../../utils/id';

interface CommentsStoreState {
  comments: Record<string, CanvasComment>;
  activeCommentId: string | null;
  isCommentModeActive: boolean;
  newCommentCoords: { x: number; y: number } | null;
  isLoading: boolean;

  // Actions
  setCommentModeActive: (active: boolean) => void;
  setNewCommentCoords: (coords: { x: number; y: number } | null) => void;
  setActiveCommentId: (id: string | null) => void;
  loadComments: (documentId: string) => Promise<void>;
  addComment: (documentId: string, pageId: string, x: number, y: number, content: string) => Promise<CanvasComment>;
  addReply: (commentId: string, content: string) => Promise<CommentReply | null>;
  toggleResolveComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  upsertRemoteComment: (comment: CanvasComment) => void;
  deleteLocalComment: (commentId: string) => void;
}

const LOCAL_STORAGE_KEY_COMMENTS = 'banava_comments_v8';

export const useCommentsStore = create<CommentsStoreState>((set, get) => ({
  comments: {},
  activeCommentId: null,
  isCommentModeActive: false,
  newCommentCoords: null,
  isLoading: false,

  setCommentModeActive: (active) => {
    set({
      isCommentModeActive: active,
      newCommentCoords: null,
    });
  },

  setNewCommentCoords: (coords) => {
    set({ newCommentCoords: coords });
  },

  setActiveCommentId: (id) => {
    set({ activeCommentId: id });
  },

  loadComments: async (documentId) => {
    set({ isLoading: true });

    // 1. If not online/configured, load from localStorage
    if (!isSupabaseConfigured()) {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_COMMENTS}_${documentId}`);
        if (raw) {
          try {
            const commentsArray: CanvasComment[] = JSON.parse(raw);
            const map: Record<string, CanvasComment> = {};
            for (const c of commentsArray) map[c.id] = c;
            set({ comments: map, isLoading: false });
            return;
          } catch {}
        }
      }
      set({ comments: {}, isLoading: false });
      return;
    }

    // 2. Fetch from Supabase PostgreSQL
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          id, document_id, page_id, user_id, user_name, user_avatar,
          x, y, content, resolved, resolved_at, resolved_by, created_at, updated_at,
          document_comment_replies (
            id, comment_id, user_id, user_name, user_avatar, content, created_at
          )
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        set({ comments: {}, isLoading: false });
        return;
      }

      const map: Record<string, CanvasComment> = {};
      for (const row of data as any[]) {
        const replies: CommentReply[] = (row.document_comment_replies || []).map((r: any) => ({
          id: r.id,
          commentId: r.comment_id,
          author: {
            id: r.user_id,
            name: r.user_name,
            avatarUrl: r.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${r.user_name}`,
          },
          content: r.content,
          createdAt: new Date(r.created_at).getTime(),
        }));

        map[row.id] = {
          id: row.id,
          documentId: row.document_id,
          pageId: row.page_id,
          x: row.x,
          y: row.y,
          author: {
            id: row.user_id,
            name: row.user_name,
            avatarUrl: row.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${row.user_name}`,
          },
          content: row.content,
          resolved: row.resolved,
          resolvedAt: row.resolved_at ? new Date(row.resolved_at).getTime() : null,
          resolvedBy: row.resolved_by,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
          replies,
        };
      }

      set({ comments: map, isLoading: false });
    } catch (err) {
      console.error('Failed to load comments from Supabase:', err);
      set({ comments: {}, isLoading: false });
    }
  },

  addComment: async (documentId, pageId, x, y, content) => {
    const authUser = useAuthStore.getState().user;
    const userId = authUser?.id || `user_${Math.random().toString(36).substring(2, 8)}`;
    const userName = authUser?.fullName || (authUser?.email ? authUser.email.split('@')[0] : 'Designer');
    const avatarUrl =
      authUser?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;

    const newComment: CanvasComment = {
      id: generateId('comment'),
      documentId,
      pageId,
      x,
      y,
      author: {
        id: userId,
        name: userName,
        avatarUrl,
      },
      content,
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      replies: [],
    };

    const nextComments = { ...get().comments, [newComment.id]: newComment };
    set({
      comments: nextComments,
      newCommentCoords: null,
      activeCommentId: newComment.id,
    });

    // Save locally
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COMMENTS}_${documentId}`, JSON.stringify(Object.values(nextComments)));
    }

    // Broadcast in real-time
    RealtimeProvider.getInstance().broadcastCommentUpdate(newComment);

    // Save to PostgreSQL if online
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('document_comments').insert({
          id: newComment.id,
          document_id: documentId,
          page_id: pageId,
          user_id: userId,
          user_name: userName,
          user_avatar: avatarUrl,
          x,
          y,
          content,
          resolved: false,
        });
      } catch (err) {
        console.warn('Failed to insert comment in Supabase:', err);
      }
    }

    return newComment;
  },

  addReply: async (commentId, content) => {
    const comment = get().comments[commentId];
    if (!comment) return null;

    const authUser = useAuthStore.getState().user;
    const userId = authUser?.id || `user_${Math.random().toString(36).substring(2, 8)}`;
    const userName = authUser?.fullName || (authUser?.email ? authUser.email.split('@')[0] : 'Designer');
    const avatarUrl =
      authUser?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`;

    const newReply: CommentReply = {
      id: generateId('reply'),
      commentId,
      author: {
        id: userId,
        name: userName,
        avatarUrl,
      },
      content,
      createdAt: Date.now(),
    };

    const updatedComment: CanvasComment = {
      ...comment,
      updatedAt: Date.now(),
      replies: [...comment.replies, newReply],
    };

    const nextComments = { ...get().comments, [commentId]: updatedComment };
    set({ comments: nextComments });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COMMENTS}_${comment.documentId}`, JSON.stringify(Object.values(nextComments)));
    }

    RealtimeProvider.getInstance().broadcastCommentUpdate(updatedComment);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('document_comment_replies').insert({
          id: newReply.id,
          comment_id: commentId,
          user_id: userId,
          user_name: userName,
          user_avatar: avatarUrl,
          content,
        });
      } catch (err) {
        console.warn('Failed to insert reply in Supabase:', err);
      }
    }

    return newReply;
  },

  toggleResolveComment: async (commentId) => {
    const comment = get().comments[commentId];
    if (!comment) return;

    const resolved = !comment.resolved;
    const authUser = useAuthStore.getState().user;

    const updatedComment: CanvasComment = {
      ...comment,
      resolved,
      resolvedAt: resolved ? Date.now() : null,
      resolvedBy: resolved ? authUser?.id || 'user' : null,
      updatedAt: Date.now(),
    };

    const nextComments = { ...get().comments, [commentId]: updatedComment };
    set({ comments: nextComments });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COMMENTS}_${comment.documentId}`, JSON.stringify(Object.values(nextComments)));
    }

    RealtimeProvider.getInstance().broadcastCommentUpdate(updatedComment);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('document_comments')
          .update({
            resolved,
            resolved_at: resolved ? new Date().toISOString() : null,
            resolved_by: resolved ? authUser?.id || null : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', commentId);
      } catch (err) {
        console.warn('Failed to update resolve state in Supabase:', err);
      }
    }
  },

  deleteComment: async (commentId) => {
    const comment = get().comments[commentId];
    if (!comment) return;

    const nextComments = { ...get().comments };
    delete nextComments[commentId];
    set({
      comments: nextComments,
      activeCommentId: get().activeCommentId === commentId ? null : get().activeCommentId,
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_COMMENTS}_${comment.documentId}`, JSON.stringify(Object.values(nextComments)));
    }

    RealtimeProvider.getInstance().broadcastCommentDelete(commentId);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('document_comments').delete().eq('id', commentId);
      } catch (err) {
        console.warn('Failed to delete comment in Supabase:', err);
      }
    }
  },

  upsertRemoteComment: (comment) => {
    const nextComments = { ...get().comments, [comment.id]: comment };
    set({ comments: nextComments });
  },

  deleteLocalComment: (commentId) => {
    const nextComments = { ...get().comments };
    delete nextComments[commentId];
    set({
      comments: nextComments,
      activeCommentId: get().activeCommentId === commentId ? null : get().activeCommentId,
    });
  },
}));
