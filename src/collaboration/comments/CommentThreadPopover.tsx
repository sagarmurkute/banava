/**
 * Comment Thread Popover Dialog for View/Reply/Resolve
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useCommentsStore } from './useCommentsStore';
import { useAuthStore } from '../../backend/auth/useAuthStore';
import type { CanvasComment } from '../types';

interface CommentThreadPopoverProps {
  comment?: CanvasComment | null;
  isDraft?: boolean;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onSubmitDraft?: (content: string) => void;
}

export const CommentThreadPopover: React.FC<CommentThreadPopoverProps> = ({
  comment,
  isDraft = false,
  screenX,
  screenY,
  onClose,
  onSubmitDraft,
}) => {
  const { addReply, toggleResolveComment, deleteComment } = useCommentsStore();
  const { user } = useAuthStore();
  const [replyText, setReplyText] = useState('');
  const [draftText, setDraftText] = useState('');

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !replyText.trim()) return;
    await addReply(comment.id, replyText.trim());
    setReplyText('');
  };

  const handleSendDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftText.trim() || !onSubmitDraft) return;
    onSubmitDraft(draftText.trim());
    setDraftText('');
  };

  return (
    <div
      className="absolute z-50 w-80 bg-surface-100 border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${screenX + 20}px`,
        top: `${screenY - 10}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-200/50 border-b border-border-subtle">
        <span className="font-semibold text-text-primary">
          {isDraft ? 'New Comment' : comment?.resolved ? 'Resolved Comment' : 'Thread'}
        </span>
        <div className="flex items-center gap-1">
          {comment && (
            <>
              <button
                onClick={() => toggleResolveComment(comment.id)}
                title={comment.resolved ? 'Reopen comment' : 'Resolve comment'}
                className={`p-1 rounded hover:bg-surface-300 transition-colors ${
                  comment.resolved ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {comment.resolved ? <RotateCcw size={13} /> : <Check size={13} />}
              </button>

              {(comment.author.id === user?.id || !comment.author.id) && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  title="Delete comment"
                  className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-surface-300 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isDraft ? (
        <form onSubmit={handleSendDraft} className="p-3 space-y-2">
          <textarea
            autoFocus
            rows={3}
            placeholder="Add a comment... (Enter to post)"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendDraft(e);
              }
            }}
            className="w-full p-2 bg-surface-200 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-500 resize-none text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-text-muted hover:bg-surface-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!draftText.trim()}
              className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Post</span>
              <Send size={12} />
            </button>
          </div>
        </form>
      ) : comment ? (
        <div className="flex flex-col max-h-72">
          {/* Main Comment */}
          <div className="p-3 border-b border-border-subtle bg-surface-100">
            <div className="flex items-center gap-2 mb-1.5">
              <img
                src={comment.author.avatarUrl}
                alt={comment.author.name}
                className="w-5 h-5 rounded-full bg-surface-300"
              />
              <span className="font-semibold text-text-primary">{comment.author.name}</span>
              <span className="text-[10px] text-text-muted ml-auto">
                {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-text-primary text-xs leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </div>

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="overflow-y-auto p-3 space-y-2.5 bg-surface-200/30">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={reply.author.avatarUrl}
                      alt={reply.author.name}
                      className="w-4 h-4 rounded-full bg-surface-300"
                    />
                    <span className="font-medium text-[11px] text-text-primary">{reply.author.name}</span>
                    <span className="text-[9px] text-text-muted ml-auto">
                      {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="pl-6 text-text-muted text-xs leading-relaxed">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {!comment.resolved && (
            <form onSubmit={handleSendReply} className="p-2.5 border-t border-border-subtle bg-surface-200/50 flex gap-2">
              <input
                type="text"
                placeholder="Reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-surface-200 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted text-xs focus:outline-hidden focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="p-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Send size={12} />
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
};
