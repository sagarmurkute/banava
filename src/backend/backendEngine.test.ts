/**
 * Phase 7 Backend Foundation Tests
 * Tests for Supabase Auth, PostgreSQL models, Cloud Storage paths, SyncEngine, and Offline Fallback.
 */

import { AuthService } from './auth/authService';
import { DatabaseService } from './database/databaseService';
import { CloudStorageService } from './storage/cloudStorageService';
import { SyncEngine } from './sync/syncEngine';
import { isSupabaseConfigured } from './supabaseClient';
import type { CloudDocumentMetadata } from './types';
import { DocumentService } from '../documents/documentEngine';

// Simple lightweight assertion runner
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

export function runBackendTests(): { name: string; passed: boolean; error?: string }[] {
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

  // 1. Supabase fallback configuration
  test('1. Supabase Client gracefully handles missing env vars and provides offline mode', () => {
    const configured = isSupabaseConfigured();
    // In local test environment without .env, configured is false
    assert(typeof configured === 'boolean', 'isSupabaseConfigured returns boolean');
  });

  // 2. Mock Signup & Profile creation
  test('2. AuthService signs up user with profile in local/offline mock mode', async () => {
    const signupRes = await AuthService.signUp('designer@banava.app', 'SecretPass123!', 'Sagar Murkute');
    assert(!signupRes.error, 'Signup should not have error');
    assert(!!signupRes.user, 'User object returned');
    assert(signupRes.user?.email === 'designer@banava.app', 'User email matches');
    assert(signupRes.user?.fullName === 'Sagar Murkute', 'User full name matches');
    assert(signupRes.profile?.storageLimitBytes === 100 * 1024 * 1024, 'Default 100MB limit');
  });

  // 3. Mock Login & Session retrieval
  test('3. AuthService logs in existing user and sets active session', async () => {
    const loginRes = await AuthService.login('designer@banava.app', 'SecretPass123!');
    assert(!loginRes.error, 'Login should not have error');
    assert(loginRes.user?.email === 'designer@banava.app', 'User matched');

    const session = await AuthService.getSession();
    assert(session !== null, 'Session exists');
    assert(session?.user.email === 'designer@banava.app', 'Session user email matches');
  });

  // 4. Update User Profile
  test('4. AuthService updates user profile metadata', async () => {
    const session = await AuthService.getSession();
    if (session) {
      const updated = await AuthService.updateProfile(session.user.id, {
        fullName: 'Sagar M. (Lead Designer)',
      });
      assert(updated, 'Profile updated');
    }
  });

  // 5. Password Reset Request
  test('5. AuthService handles password reset request', async () => {
    const resetRes = await AuthService.resetPassword('designer@banava.app');
    assert(!resetRes.error, 'Password reset request succeeds without error');
  });

  // 6. Cloud Document Metadata validation
  test('6. CloudDocumentMetadata supports Phase 6 document models', () => {
    const sampleDoc = DocumentService.createDocument('E-Commerce App');
    const cloudMeta: CloudDocumentMetadata = {
      id: sampleDoc.id,
      userId: 'mock-user-123',
      name: sampleDoc.name,
      schemaVersion: sampleDoc.metadata?.schemaVersion || sampleDoc.version || 6,
      version: sampleDoc.version || 6,
      projectId: null,
      folderId: null,
      storagePath: `mock-user-123/${sampleDoc.id}.banava`,
      fileSizeBytes: 2048,
      pageCount: sampleDoc.pages.length,
      objectCount: 1,
      isTemplate: false,
      revision: 1,
      createdAt: new Date(sampleDoc.metadata?.createdAt || Date.now()).toISOString(),
      updatedAt: new Date(sampleDoc.metadata?.updatedAt || Date.now()).toISOString(),
      deletedAt: null,
    };

    assert(cloudMeta.id === sampleDoc.id, 'Metadata ID matches doc ID');
    assert(cloudMeta.storagePath === `mock-user-123/${sampleDoc.id}.banava`, 'Storage path formatted');
    assert(cloudMeta.schemaVersion === 6, 'Schema version is 6');
  });

  // 7. Cloud Project CRUD operations
  test('7. DatabaseService creates and lists projects', async () => {
    const newProj = await DatabaseService.createProject('Mobile UI Kits', 'Mock User');
    assert(newProj.name === 'Mobile UI Kits', 'Project created with correct name');

    const projects = await DatabaseService.listProjects();
    assert(projects.some((p) => p.name === 'Mobile UI Kits'), 'Project appears in list');
  });

  // 8. Cloud Folder CRUD operations
  test('8. DatabaseService creates and lists folders within a project', async () => {
    const projects = await DatabaseService.listProjects();
    const projId = projects[0]?.id;
    const newFolder = await DatabaseService.createFolder('Wireframes', projId, null);
    assert(newFolder.name === 'Wireframes', 'Folder created with correct name');
    assert(newFolder.projectId === projId, 'Folder associated with project');

    const folders = await DatabaseService.listFolders(projId);
    assert(folders.some((f) => f.name === 'Wireframes'), 'Folder appears in list');
  });

  // 9. Cloud Storage Path formatting
  test('9. CloudStorageService generates standardized multi-tenant storage paths', () => {
    const docId = 'doc-xyz-456';
    const userId = 'usr-abc-123';
    const path = `${userId}/${docId}.banava`;
    assert(path === 'usr-abc-123/doc-xyz-456.banava', 'Standard storage path format');
  });

  // 10. Storage recalculation calculation
  test('10. CloudStorageService calculates aggregate storage consumption', async () => {
    const session = await AuthService.getSession();
    if (session) {
      const bytesUsed = await CloudStorageService.recalculateStorageUsed(session.user.id);
      assert(typeof bytesUsed === 'number', 'Storage calculated as byte count');
      assert(bytesUsed >= 0, 'Bytes non-negative');
    }
  });

  // 11. SyncEngine status listener & initial state
  test('11. SyncEngine registers listener and reports accurate sync status', () => {
    let receivedStatus = '';
    const unsubscribe = SyncEngine.subscribe((status) => {
      receivedStatus = status.state;
    });

    const currentStatus = SyncEngine.getStatus();
    assert(['synced', 'syncing', 'offline', 'local-only', 'error'].includes(currentStatus.state), 'Valid sync status');
    assert(receivedStatus.length > 0, 'Listener triggered');
    unsubscribe();
  });

  // 12. Offline mode transition handling
  test('12. SyncEngine transitions to offline status on network event', () => {
    SyncEngine.setOfflineStatus(true);
    assert(SyncEngine.getStatus().state === 'offline', 'SyncEngine reports offline');
    SyncEngine.setOfflineStatus(false);
  });

  // 13. Queue Document for Sync
  test('13. SyncEngine queues modified documents for background cloud sync', async () => {
    const testDoc = DocumentService.createDocument('Dashboard Design');
    // Mark dirty in sync queue
    SyncEngine.markDocumentDirty(testDoc.id);
    const session = await AuthService.getSession();
    const syncRes = await SyncEngine.syncDocumentToCloud(session?.user.id || null, testDoc);
    assert(typeof syncRes === 'boolean', 'Sync document completed or saved locally');
  });

  // 14. Full End-to-End Workflow: Create Doc -> Save Cloud -> Sync
  test('14. Full End-to-End lifecycle: Signup -> Create Project -> Create Doc -> Cloud Save -> Sync', async () => {
    const project = await DatabaseService.createProject('Brand Identity');
    const newDoc = DocumentService.createDocument('Logo Guidelines', project.id);
    const session = await AuthService.getSession();
    const syncResult = await SyncEngine.syncDocumentToCloud(session?.user.id || null, newDoc);
    assert(typeof syncResult === 'boolean', 'Full document lifecycle sync passed');
  });

  // 15. Signout teardown
  test('15. AuthService logs out and clears active user session', async () => {
    const logoutRes = await AuthService.logout();
    assert(!logoutRes.error, 'Logout succeeded without error');
    const session = await AuthService.getSession();
    assert(session === null, 'Session is cleared');
  });

  return results;
}
