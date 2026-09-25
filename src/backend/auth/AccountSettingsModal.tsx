import React, { useState } from 'react';
import {
  X,
  HardDrive,
  Cloud,
  LogOut,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useAuthStore } from './useAuthStore';
import { SyncEngine } from '../sync/syncEngine';

export const AccountSettingsModal: React.FC = () => {
  const {
    user,
    profile,
    isAccountSettingsOpen,
    closeAccountSettings,
    logout,
    updateProfile,
    isOfflineMode,
  } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isAccountSettingsOpen) return null;

  const storageUsed = profile?.storageUsedBytes || 0;
  const storageLimit = profile?.storageLimitBytes || 100 * 1024 * 1024;
  const usedMB = (storageUsed / (1024 * 1024)).toFixed(2);
  const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
  const percentage = Math.min(100, (storageUsed / storageLimit) * 100);

  const handleSaveProfile = async () => {
    const success = await updateProfile(fullName);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await SyncEngine.syncAll(() => user?.id || null);
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-100 border border-border-default rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-text-primary">
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={
                user?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.email || 'User')}`
              }
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-border-default bg-surface-200"
            />
            <div>
              <h2 className="text-sm font-bold text-text-primary">{user?.fullName || 'BANAVA User'}</h2>
              <p className="text-xs text-text-muted">{user?.email}</p>
            </div>
          </div>
          <button
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-200"
            onClick={closeAccountSettings}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          {/* Profile Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Profile Settings
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-text-muted">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 bg-surface-200 border border-border-default rounded-lg text-xs text-text-primary outline-none focus:border-brand"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <button
                  className="px-3 py-2 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg text-xs flex items-center gap-1"
                  onClick={handleSaveProfile}
                >
                  {isSaved ? <Check size={13} /> : null}
                  <span>{isSaved ? 'Saved' : 'Update'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cloud Storage Usage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-text-secondary uppercase tracking-wider">
                <HardDrive size={13} />
                <span>Cloud Storage</span>
              </div>
              <span className="text-brand font-semibold">
                {usedMB} MB / {limitMB} MB
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-surface-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, percentage)}%` }}
              />
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="p-4 rounded-xl bg-surface-200/40 border border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Cloud size={18} />
              </div>
              <div>
                <div className="font-semibold text-text-primary">
                  {isOfflineMode ? 'Local Mode Active' : 'PostgreSQL & Cloud Storage'}
                </div>
                <div className="text-[11px] text-text-muted">
                  {isOfflineMode
                    ? 'Documents stored securely in browser storage'
                    : 'Encrypted & backed up with Supabase'}
                </div>
              </div>
            </div>

            <button
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-surface-300 hover:bg-surface-200 text-text-primary font-medium text-xs flex items-center gap-1.5"
              onClick={handleManualSync}
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-200/30 flex items-center justify-between">
          <button
            className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-medium text-xs flex items-center gap-1.5"
            onClick={logout}
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>

          <button
            className="px-4 py-1.5 rounded-lg bg-surface-300 text-text-primary font-medium hover:bg-surface-200 text-xs"
            onClick={closeAccountSettings}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
