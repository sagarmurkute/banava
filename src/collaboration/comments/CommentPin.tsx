/**
 * Canvas Comment Pin Marker
 */

import React from 'react';
import { MessageSquare, Check } from 'lucide-react';
import type { CanvasComment } from '../types';

interface CommentPinProps {
  comment: CanvasComment;
  isActive: boolean;
  screenX: number;
  screenY: number;
  onClick: () => void;
}

export const CommentPin: React.FC<CommentPinProps> = ({
  comment,
  isActive,
  screenX,
  screenY,
  onClick,
}) => {
  const replyCount = comment.replies?.length || 0;

  return (
    <div
      className={`absolute z-35 -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
        isActive ? 'scale-115 z-40' : 'hover:scale-110'
      }`}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div
        className={`relative flex items-center justify-center cursor-pointer shadow-lg rounded-full border-2 transition-all ${
          comment.resolved
            ? 'w-7 h-7 bg-surface-300 border-border-default opacity-60 hover:opacity-100'
            : isActive
            ? 'w-9 h-9 bg-primary-500 border-white ring-4 ring-primary-500/30'
            : 'w-8 h-8 bg-surface-100 border-primary-500 hover:border-white'
        }`}
        title={`Comment by ${comment.author.name}: ${comment.content.substring(0, 40)}...`}
      >
        {comment.resolved ? (
          <Check size={14} className="text-emerald-400" />
        ) : comment.author.avatarUrl ? (
          <img
            src={comment.author.avatarUrl}
            alt={comment.author.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <MessageSquare size={14} className={isActive ? 'text-white' : 'text-primary-400'} />
        )}

        {/* Reply Badge */}
        {replyCount > 0 && !comment.resolved && (
          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 min-w-[15px] h-[15px] rounded-full bg-primary-600 border border-white text-[9px] font-bold text-white flex items-center justify-center">
            {replyCount}
          </span>
        )}
      </div>
    </div>
  );
};
