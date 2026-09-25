import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { CloudDocumentMetadata } from '../types';
import type { BanavaProject, BanavaFolder } from '../../documents/types';
import type { DocumentModel } from '../../types/document';
import { generateId } from '../../utils/id';

export class DatabaseService {
  /**
   * List all documents for the authenticated user
   */
  public static async listDocuments(userId?: string): Promise<CloudDocumentMetadata[]> {
    const activeUserId = userId || 'mock_user_default';
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', activeUserId)
        .order('updated_at', { ascending: false });

      if (error || !data) return [];

      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        projectId: d.project_id,
        folderId: d.folder_id,
        name: d.name,
        description: d.description,
        thumbnailUrl: d.thumbnail_url,
        storagePath: d.storage_path,
        version: d.version,
        schemaVersion: d.schema_version,
        pageCount: d.page_count,
        objectCount: d.object_count,
        fileSizeBytes: Number(d.file_size_bytes) || 0,
        isTemplate: d.is_template,
        deletedAt: d.deleted_at,
        revision: d.revision,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (err) {
      console.error('Failed to query cloud documents:', err);
      return [];
    }
  }

  /**
   * Save document metadata in PostgreSQL
   */
  public static async saveDocumentMetadata(
    userId: string,
    doc: DocumentModel,
    storagePath: string,
    fileSizeBytes: number
  ): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const payload = {
        id: doc.id,
        user_id: userId,
        project_id: doc.metadata?.projectId || null,
        folder_id: doc.metadata?.folderId || null,
        name: doc.name,
        description: doc.metadata?.description || '',
        thumbnail_url: doc.metadata?.thumbnail || null,
        storage_path: storagePath,
        version: doc.version || 6,
        schema_version: doc.metadata?.schemaVersion || 6,
        page_count: doc.pages.length,
        object_count: doc.pages.reduce((acc: number, p: any) => acc + (p.objects?.length || 0), 0),
        file_size_bytes: fileSizeBytes,
        is_template: doc.metadata?.isTemplate || false,
        deleted_at: doc.metadata?.deletedAt ? new Date(doc.metadata.deletedAt).toISOString() : null,
        revision: doc.metadata?.revision || 1,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('documents').upsert(payload);
      return !error;
    } catch (err) {
      console.error('Failed to save document metadata in DB:', err);
      return false;
    }
  }

  /**
   * Soft delete or permanently delete document in PostgreSQL
   */
  public static async deleteDocument(userId: string, docId: string, permanent = false): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      if (permanent) {
        const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', docId)
          .eq('user_id', userId);
        return !error;
      } else {
        const { error } = await supabase
          .from('documents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', docId)
          .eq('user_id', userId);
        return !error;
      }
    } catch {
      return false;
    }
  }

  /**
   * Restore document from trash in PostgreSQL
   */
  public static async restoreDocument(userId: string, docId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: null })
        .eq('id', docId)
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  }

  // ---------------- Projects ----------------
  public static async listProjects(userId?: string): Promise<BanavaProject[]> {
    const activeUserId = userId || 'mock_user_default';
    if (!isSupabaseConfigured()) {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem('banava_mock_projects_v7');
      return raw ? JSON.parse(raw) : [];
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        createdAt: new Date(p.created_at).getTime(),
        updatedAt: new Date(p.updated_at).getTime(),
      }));
    } catch {
      return [];
    }
  }

  public static async createProject(name: string, description?: string, userId?: string): Promise<BanavaProject> {
    const project: BanavaProject = {
      id: generateId('proj'),
      name,
      description: description || '',
      color: '#6366f1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!isSupabaseConfigured()) {
      if (typeof localStorage !== 'undefined') {
        const existing = await this.listProjects();
        existing.push(project);
        localStorage.setItem('banava_mock_projects_v7', JSON.stringify(existing));
      }
      return project;
    }

    await this.saveProject(userId || 'mock_user_default', project);
    return project;
  }

  public static async saveProject(userId: string, project: BanavaProject): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { error } = await supabase.from('projects').upsert({
        id: project.id,
        user_id: userId,
        name: project.name,
        description: project.description || '',
        color: project.color || '#6366f1',
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  public static async deleteProject(userId: string, projectId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  }

  // ---------------- Folders ----------------
  public static async listFolders(projectId?: string | null, userId?: string): Promise<BanavaFolder[]> {
    const activeUserId = userId || 'mock_user_default';
    if (!isSupabaseConfigured()) {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem('banava_mock_folders_v7');
      const all: BanavaFolder[] = raw ? JSON.parse(raw) : [];
      if (projectId) return all.filter((f) => f.projectId === projectId);
      return all;
    }

    try {
      let query = supabase
        .from('folders')
        .select('*')
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((f: any) => ({
        id: f.id,
        projectId: f.project_id,
        parentId: f.parent_id,
        name: f.name,
        createdAt: new Date(f.created_at).getTime(),
        updatedAt: new Date(f.updated_at).getTime(),
      }));
    } catch {
      return [];
    }
  }

  public static async createFolder(name: string, projectId?: string | null, parentId?: string | null, userId?: string): Promise<BanavaFolder> {
    const folder: BanavaFolder = {
      id: generateId('fld'),
      name,
      projectId: projectId || null,
      parentId: parentId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!isSupabaseConfigured()) {
      if (typeof localStorage !== 'undefined') {
        const existing = await this.listFolders();
        existing.push(folder);
        localStorage.setItem('banava_mock_folders_v7', JSON.stringify(existing));
      }
      return folder;
    }

    await this.saveFolder(userId || 'mock_user_default', folder);
    return folder;
  }

  public static async saveFolder(userId: string, folder: BanavaFolder): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { error } = await supabase.from('folders').upsert({
        id: folder.id,
        user_id: userId,
        project_id: folder.projectId || null,
        parent_id: folder.parentId || null,
        name: folder.name,
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }

  public static async deleteFolder(userId: string, folderId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId) return false;

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);
      return !error;
    } catch {
      return false;
    }
  }
}
