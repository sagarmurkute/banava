/**
 * Comments List Sidebar Panel
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';
import { useCommentsStore } from './useCommentsStore';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useViewportStore } from '../../state/useViewportStore';

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ isOpen, onClose }) => {
  const { doc } = useDocumentStore();
  const { setViewport } = useViewportStore();
  const { comments, activeCommentId, setActiveCommentId, toggleResolveComment } = useCommentsStore();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [search, setSearch] = useState('');

  if (!isOpen || !doc) return null;

  const docComments = Object.values(comments).filter((c) => c.documentId === doc.id);

  const filteredComments = docComments.filter((c) => {
    if (filter === 'unresolved' && c.resolved) return false;
    if (filter === 'resolved' && !c.resolved) return false;
    if (search.trim()) {
      const matchContent = c.content.toLowerCase().includes(search.toLowerCase());
      const matchAuthor = c.author.name.toLowerCase().includes(search.toLowerCase());
      return matchContent || matchAuthor;
    }
    return true;
  });

  const handleFocusComment = (commentId: string, x: number, y: number) => {
    setActiveCommentId(commentId);
    // Pan canvas to center on comment
    setViewport({
      x: window.innerWidth / 2 - x,
      y: window.innerHeight / 2 - y,
    });
  };

  return (
    <div className="fixed top-12 right-0 bottom-8 w-80 bg-surface-100 border-l border-border-default z-40 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-border-subtle bg-surface-200/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary-400" />
          <h2 className="text-xs font-semibold text-text-primary">Comments ({docComments.length})</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-300 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-3 border-b border-border-subtle space-y-2 bg-surface-200/30">
        <div className="flex items-center gap-1.5 p-1 bg-surface-200 rounded-lg text-xs">
          <button
            onClick={() => setFilter('unresolved')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filter === 'unresolved' ? 'bg-surface-300 text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filter === 'resolved' ? 'bg-surface-300 text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-surface-300 text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            All
          </button>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search comments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface-200 border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary-500"
          />
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredComments.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-text-muted">
            <CheckCircle2 size={24} className="mb-2 text-emerald-400 opacity-60" />
            <p className="text-xs font-medium">No comments found</p>
            <p className="text-[11px] text-text-muted mt-1">
              Press <kbd className="px-1 py-0.5 bg-surface-300 rounded text-[10px]">C</kbd> to add comments to the canvas
            </p>
          </div>
        ) : (
          filteredComments.map((c) => (
            <div
              key={c.id}
              onClick={() => handleFocusComment(c.id, c.x, c.y)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeCommentId === c.id
                  ? 'bg-surface-200 border-primary-500/80 shadow-xs'
                  : 'bg-surface-200/40 border-border-subtle hover:bg-surface-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <img
                    src={c.author.avatarUrl}
                    alt={c.author.name}
                    className="w-5 h-5 rounded-full bg-surface-300"
                  />
                  <span className="text-xs font-semibold text-text-primary">{c.author.name}</span>
                </div>
                <span className="text-[10px] text-text-muted">
                  {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <p className="text-xs text-text-primary line-clamp-2 mb-2">{c.content}</p>

              <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-subtle">
                <span>{c.replies.length} replies</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleResolveComment(c.id);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    c.resolved
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-surface-300 hover:bg-surface-400 text-text-primary'
                  }`}
                >
                  {c.resolved ? 'Resolved' : 'Resolve'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
