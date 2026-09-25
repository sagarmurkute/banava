import type { Page, Asset, DesignSystemStyles, DesignSystemVariables } from '../types/document';
import type { PrototypeDocumentData } from '../prototype/types';

export const BANAVA_SCHEMA_VERSION = 6;
export const BANAVA_FILE_EXTENSION = '.banava';

export interface BanavaDocumentMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  schemaVersion: number;
  author?: string;
  thumbnail?: string;
  coverNodeId?: string;
  projectId?: string | null;
  folderId?: string | null;
  deletedAt?: number | null;
  isTemplate?: boolean;
  revision: number;
  contentHash?: string;
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  name: string;
  description?: string;
  createdAt: number;
  thumbnail?: string;
  docData: string;
}

export interface BanavaProject {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
}

export interface BanavaFolder {
  id: string;
  projectId?: string | null;
  parentId?: string | null;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentSummary {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  thumbnail?: string;
  projectId?: string | null;
  folderId?: string | null;
  deletedAt?: number | null;
  pageCount: number;
  objectCount: number;
  fileSizeBytes?: number;
}

export type ExportFormat = 'PNG' | 'JPG' | 'SVG' | 'PDF' | 'BANAVA';

export interface ExportSetting {
  id: string;
  format: ExportFormat;
  scale: 1 | 2 | 3 | 4;
  quality?: number; // 10-100 for JPG
  transparent?: boolean;
  backgroundColor?: string;
  suffix?: string;
}

export interface CrashRecoveryRecord {
  documentId: string;
  documentName: string;
  timestamp: number;
  documentData: string;
}

export interface BanavaFileFormat {
  schemaVersion: number;
  documentVersion: string;
  metadata: BanavaDocumentMetadata;
  pages: Page[];
  assets: Record<string, Asset>;
  components?: Record<string, any>;
  componentSets?: Record<string, any>;
  styles?: DesignSystemStyles;
  variables?: DesignSystemVariables;
  prototype?: PrototypeDocumentData;
  settings?: Record<string, any>;
}
