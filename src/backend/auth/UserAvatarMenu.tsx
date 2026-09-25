import React, { useEffect, useState } from 'react';
import { Cloud, RefreshCw, WifiOff, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from './useAuthStore';
import { SyncEngine } from '../sync/syncEngine';
import type { SyncStatus } from '../types';

export const UserAvatarMenu: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, openAccountSettings } = useAuthStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());

  useEffect(() => {
    return SyncEngine.subscribe((status) => {
      setSyncStatus({ ...status });
    });
  }, []);

  const renderSyncBadge = () => {
    switch (syncStatus.state) {
      case 'syncing':
        return (
          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium" title={syncStatus.message}>
            <RefreshCw size={11} className="animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </div>
        );
      case 'synced':
        return (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium" title={syncStatus.message || 'Synced with Cloud'}>
            <CheckCircle2 size={11} />
            <span className="hidden sm:inline">Synced</span>
          </div>
        );
      case 'offline':
        return (
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium" title="Offline (Saved locally)">
            <WifiOff size={11} />
            <span className="hidden sm:inline">Offline</span>
          </div>
        );
      case 'local-only':
      default:
        return (
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium" title="Local Storage Active">
            <Cloud size={11} />
            <span className="hidden sm:inline">Local</span>
          </div>
        );
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        {renderSyncBadge()}
        <button
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-200 hover:bg-surface-300 text-text-primary border border-border-default transition-all"
          onClick={() => openAuthModal('login')}
        >
          Sign In
        </button>
      </div>
    );
  }

  const avatarUrl =
    user.avatarUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName || user.email)}`;

  return (
    <div className="flex items-center gap-2.5">
      {renderSyncBadge()}
      <button
        className="flex items-center gap-2 p-1 pr-2 rounded-full bg-surface-200/60 hover:bg-surface-200 border border-border-subtle transition-colors cursor-pointer"
        onClick={openAccountSettings}
        title="Account & Storage Settings"
      >
        <img src={avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full bg-surface-300" />
        <span className="text-xs font-medium text-text-primary max-w-[100px] truncate hidden md:inline">
          {user.fullName || user.email.split('@')[0]}
        </span>
      </button>
    </div>
  );
};
