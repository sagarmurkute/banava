/**
 * Collaborator Avatar Stack, Live Status, and Share Trigger in Top Toolbar
 */

import React from 'react';
import {
  Users,
  WifiOff,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { usePresenceStore } from './usePresenceStore';
import { usePermissionsStore } from '../permissions/usePermissionsStore';
import { useCommentsStore } from '../comments/useCommentsStore';

interface CollaboratorAvatarStackProps {
  onToggleCommentsSidebar: () => void;
  isCommentsSidebarOpen: boolean;
}

export const CollaboratorAvatarStack: React.FC<CollaboratorAvatarStackProps> = ({
  onToggleCommentsSidebar,
  isCommentsSidebarOpen,
}) => {
  const { collaborators, connectionStatus } = usePresenceStore();
  const { openShareModal } = usePermissionsStore();
  const { comments, isCommentModeActive, setCommentModeActive } = useCommentsStore();

  const collaboratorList = Object.values(collaborators).filter(
    (c) => Date.now() - c.lastActive < 60000
  );

  const openCommentsCount = Object.values(comments).filter((c) => !c.resolved).length;

  const renderStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium" title="Multiplayer Connected">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden xl:inline">Live</span>
          </div>
        );
      case 'connecting':
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium" title="Connecting...">
            <RefreshCw size={11} className="animate-spin" />
            <span className="hidden xl:inline">Connecting</span>
          </div>
        );
      case 'offline':
      case 'disconnected':
      default:
        return (
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium" title="Offline / Local Sync Active">
            <WifiOff size={11} />
            <span className="hidden xl:inline">Local</span>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Live Status Indicator */}
      {renderStatusIcon()}

      {/* Collaborator Avatars */}
      <div className="flex items-center -space-x-2 overflow-hidden px-1">
        {collaboratorList.slice(0, 4).map((c) => (
          <div
            key={c.userId}
            className="relative w-6 h-6 rounded-full ring-2 ring-surface-100 transition-transform hover:scale-115 hover:z-10 cursor-pointer"
            style={{ backgroundColor: c.color }}
            title={`${c.userName} (Active)`}
          >
            <img src={c.avatarUrl} alt={c.userName} className="w-full h-full rounded-full object-cover" />
            <span
              className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface-100"
              style={{ backgroundColor: c.color }}
            />
          </div>
        ))}

        {collaboratorList.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-surface-300 ring-2 ring-surface-100 flex items-center justify-center text-[10px] font-bold text-text-primary">
            +{collaboratorList.length - 4}
          </div>
        )}
      </div>

      {/* Comment Tool Button */}
      <button
        onClick={() => setCommentModeActive(!isCommentModeActive)}
        title={isCommentModeActive ? 'Exit Comment Tool (C)' : 'Comment Tool (C)'}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
          isCommentModeActive
            ? 'bg-primary-500 text-white border-primary-500 shadow-md'
            : 'bg-surface-200 hover:bg-surface-300 text-text-primary border-border-default'
        }`}
      >
        <MessageSquare size={13} />
        {openCommentsCount > 0 && (
          <span className="px-1 py-0.2 rounded-full bg-primary-600 text-[10px] text-white font-bold">
            {openCommentsCount}
          </span>
        )}
      </button>

      {/* Comments List Sidebar Trigger */}
      <button
        onClick={onToggleCommentsSidebar}
        title="View all comments"
        className={`p-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
          isCommentsSidebarOpen
            ? 'bg-surface-300 border-primary-500 text-text-primary'
            : 'bg-surface-200 hover:bg-surface-300 border-border-default text-text-muted hover:text-text-primary'
        }`}
      >
        <Users size={13} />
      </button>

      {/* Share Button */}
      <button
        onClick={openShareModal}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
      >
        <span>Share</span>
      </button>
    </div>
  );
};
