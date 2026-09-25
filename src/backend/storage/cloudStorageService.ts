import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { DocumentModel } from '../../types/document';

const DOCUMENTS_BUCKET = 'documents';

export class CloudStorageService {
  /**
   * Upload a complete .banava document file to Supabase Storage
   */
  public static async uploadDocumentFile(
    userId: string,
    doc: DocumentModel
  ): Promise<{ storagePath: string; fileSizeBytes: number; error: Error | null }> {
    const jsonStr = JSON.stringify(doc, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileSizeBytes = blob.size;
    const storagePath = `${userId}/${doc.id}.banava`;

    if (!isSupabaseConfigured() || !userId) {
      return { storagePath, fileSizeBytes, error: null };
    }

    try {
      const { error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, blob, {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) {
        console.warn('Storage upload error (continuing with local fallback):', error.message);
        return { storagePath, fileSizeBytes, error };
      }

      // Update user storage count
      this.recalculateStorageUsed(userId).catch(console.error);

      return { storagePath, fileSizeBytes, error: null };
    } catch (err: any) {
      return { storagePath, fileSizeBytes, error: err };
    }
  }

  /**
   * Download a .banava document file from Supabase Storage
   */
  public static async downloadDocumentFile(
    storagePath: string
  ): Promise<{ document: DocumentModel | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { document: null, error: new Error('Supabase not configured') };
    }

    try {
      const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .download(storagePath);

      if (error || !data) {
        return { document: null, error };
      }

      const text = await data.text();
      const document: DocumentModel = JSON.parse(text);
      return { document, error: null };
    } catch (err: any) {
      return { document: null, error: err };
    }
  }

  /**
   * Delete document file from storage
   */
  public static async deleteDocumentFile(storagePath: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const { error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([storagePath]);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Calculate and update total storage usage for user profile
   */
  public static async recalculateStorageUsed(userId: string): Promise<number> {
    if (!isSupabaseConfigured() || !userId) {
      return 0;
    }

    try {
      const { data } = await supabase
        .from('documents')
        .select('file_size_bytes')
        .eq('user_id', userId);

      const totalBytes = (data || []).reduce(
        (sum: number, item: any) => sum + (Number(item.file_size_bytes) || 0),
        0
      );

      await supabase
        .from('profiles')
        .update({
          storage_used_bytes: totalBytes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return totalBytes;
    } catch (err) {
      console.error('Failed to recalculate storage used:', err);
      return 0;
    }
  }
}

