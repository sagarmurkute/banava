/**
 * Canvas Comments Overlay Layer
 */

import React, { useEffect } from 'react';
import { useCommentsStore } from './useCommentsStore';
import { useDocumentStore } from '../../state/useDocumentStore';
import { useViewportStore } from '../../state/useViewportStore';
import { CommentPin } from './CommentPin';
import { CommentThreadPopover } from './CommentThreadPopover';

export const CanvasCommentsLayer: React.FC = () => {
  const { doc } = useDocumentStore();
  const { zoom, x: panX, y: panY } = useViewportStore();
  const {
    comments,
    activeCommentId,
    setActiveCommentId,
    newCommentCoords,
    setNewCommentCoords,
    setCommentModeActive,
    loadComments,
    addComment,
  } = useCommentsStore();

  const activeDocId = doc?.id;
  const activePageId = doc?.activePageId || 'page-1';

  useEffect(() => {
    if (activeDocId) {
      loadComments(activeDocId);
    }
  }, [activeDocId]);

  if (!doc) return null;

  const pageComments = Object.values(comments).filter(
    (c) => c.documentId === doc.id && c.pageId === activePageId
  );

  const activeComment = activeCommentId ? comments[activeCommentId] : null;

  const handleCreateDraft = async (content: string) => {
    if (!newCommentCoords || !doc) return;
    await addComment(
      doc.id,
      activePageId,
      newCommentCoords.x,
      newCommentCoords.y,
      content
    );
    setNewCommentCoords(null);
    setCommentModeActive(false);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-35 overflow-hidden">
      {/* Existing Comment Pins */}
      {pageComments.map((comment) => {
        const screenX = comment.x * zoom + panX;
        const screenY = comment.y * zoom + panY;

        return (
          <div key={comment.id} className="pointer-events-auto">
            <CommentPin
              comment={comment}
              isActive={activeCommentId === comment.id}
              screenX={screenX}
              screenY={screenY}
              onClick={() => {
                setNewCommentCoords(null);
                setActiveCommentId(activeCommentId === comment.id ? null : comment.id);
              }}
            />
          </div>
        );
      })}

      {/* Active Comment Popover */}
      {activeComment && (
        <div className="pointer-events-auto">
          <CommentThreadPopover
            comment={activeComment}
            screenX={activeComment.x * zoom + panX}
            screenY={activeComment.y * zoom + panY}
            onClose={() => setActiveCommentId(null)}
          />
        </div>
      )}

      {/* New Draft Comment Pin & Popover */}
      {newCommentCoords && (
        <div className="pointer-events-auto">
          <div
            className="absolute z-40 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-500 border-2 border-white shadow-xl animate-bounce flex items-center justify-center text-white"
            style={{
              left: `${newCommentCoords.x * zoom + panX}px`,
              top: `${newCommentCoords.y * zoom + panY}px`,
            }}
          >
            💬
          </div>
          <CommentThreadPopover
            isDraft
            screenX={newCommentCoords.x * zoom + panX}
            screenY={newCommentCoords.y * zoom + panY}
            onClose={() => setNewCommentCoords(null)}
            onSubmitDraft={handleCreateDraft}
          />
        </div>
      )}
    </div>
  );
};
