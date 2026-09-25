/**
 * Share Document & Permissions Modal
 */

import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Copy,
  Check,
  Globe,
  Trash2,
  Shield,
  Eye,
  Edit3,
} from 'lucide-react';
import { usePermissionsStore } from './usePermissionsStore';
import { useDocumentStore } from '../../state/useDocumentStore';
import type { CollaborationRole } from '../types';

export const ShareDocumentModal: React.FC = () => {
  const { doc } = useDocumentStore();
  const {
    isShareModalOpen,
    closeShareModal,
    collaborators,
    currentUserRole,
    inviteCollaborator,
    updateCollaboratorRole,
    removeCollaborator,
  } = usePermissionsStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaborationRole>('editor');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isShareModalOpen || !doc) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}?doc=${doc.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await inviteCollaborator(doc.id, email.trim(), role);
    setEmail('');
    setIsSubmitting(false);
  };

  const isOwner = currentUserRole === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-surface-100 border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-surface-200/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center border border-primary-500/20">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Share "{doc.name}"</h2>
              <p className="text-xs text-text-muted">Invite teammates to collaborate in real time</p>
            </div>
          </div>
          <button
            onClick={closeShareModal}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Invite input form */}
        <div className="p-5 space-y-4">
          {isOwner ? (
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 px-3 py-2 text-xs bg-surface-200 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-500 transition-all"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CollaborationRole)}
                className="px-3 py-2 text-xs bg-surface-200 border border-border-default rounded-lg text-text-primary focus:outline-hidden focus:border-primary-500 cursor-pointer"
              >
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
              </select>
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="px-4 py-2 text-xs font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={13} />
                <span>Invite</span>
              </button>
            </form>
          ) : (
            <div className="p-3 bg-surface-200/50 border border-border-subtle rounded-lg flex items-center gap-2 text-xs text-text-muted">
              <Shield size={14} className="text-amber-400" />
              <span>You are viewing this document with {currentUserRole} permissions.</span>
            </div>
          )}

          {/* Collaborator List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Collaborators</h3>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {/* Document Owner */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-200/40 border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary-600/30 text-primary-400 flex items-center justify-center text-xs font-bold border border-primary-500/30">
                    O
                  </div>
                  <div>
                    <div className="text-xs font-medium text-text-primary">Document Owner</div>
                    <div className="text-[11px] text-text-muted">{doc.metadata?.author || 'Creator'}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-text-muted px-2 py-0.5 rounded bg-surface-300">
                  Owner
                </span>
              </div>

              {/* Invited Collaborators */}
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-200/40 border border-border-subtle hover:bg-surface-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={c.avatarUrl} alt={c.fullName} className="w-7 h-7 rounded-full bg-surface-300" />
                    <div>
                      <div className="text-xs font-medium text-text-primary">{c.email}</div>
                      <div className="text-[10px] text-text-muted capitalize flex items-center gap-1">
                        {c.role === 'editor' ? <Edit3 size={10} /> : <Eye size={10} />}
                        {c.role}
                      </div>
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={c.role}
                        onChange={(e) => updateCollaboratorRole(c.id, e.target.value as CollaborationRole)}
                        className="px-2 py-1 text-xs bg-surface-300 border border-border-default rounded text-text-primary focus:outline-hidden"
                      >
                        <option value="editor">Can edit</option>
                        <option value="viewer">Can view</option>
                      </select>
                      <button
                        onClick={() => removeCollaborator(c.id)}
                        title="Remove collaborator"
                        className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-surface-300 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-text-muted px-2 py-0.5 rounded bg-surface-300 capitalize">
                      {c.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer / Copy link */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-surface-200/60">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Globe size={13} />
            <span>Anyone with the link can access</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-300 hover:bg-surface-400 text-text-primary rounded-lg border border-border-default transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
