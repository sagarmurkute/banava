export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  tier: 'free' | 'pro' | 'team';
  createdAt: string;
  updatedAt: string;
}

export interface CloudDocumentMetadata {
  id: string;
  userId: string;
  projectId?: string | null;
  folderId?: string | null;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  storagePath: string;
  version: number;
  schemaVersion: number;
  pageCount: number;
  objectCount: number;
  fileSizeBytes: number;
  isTemplate: boolean;
  deletedAt?: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudFolder {
  id: string;
  userId: string;
  projectId?: string | null;
  parentId?: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error' | 'local-only';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  pendingUploadsCount: number;
  message?: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isOfflineMode: boolean;
  isLoading: boolean;
}
