/**
 * Phase 8 Collaboration Types
 */

export type CollaborationRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  id: string;
  documentId: string;
  userId?: string | null;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: CollaborationRole;
  invitedBy?: string | null;
  createdAt: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  avatarUrl: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selectedObjectIds: string[];
  activePageId: string;
  lastActive: number;
  role?: CollaborationRole;
}

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
}

export interface CommentReply {
  id: string;
  commentId: string;
  author: CommentAuthor;
  content: string;
  createdAt: number;
}

export interface CanvasComment {
  id: string;
  documentId: string;
  pageId: string;
  x: number;
  y: number;
  author: CommentAuthor;
  content: string;
  resolved: boolean;
  resolvedAt?: number | null;
  resolvedBy?: string | null;
  createdAt: number;
  updatedAt: number;
  replies: CommentReply[];
}

export type CollaborationConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export interface YjsSyncMessage {
  type: 'yjs-update' | 'presence' | 'comment-update';
  documentId: string;
  senderId: string;
  payload: any;
  timestamp: number;
}
