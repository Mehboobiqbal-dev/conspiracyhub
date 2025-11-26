'use client';

import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentCountButtonProps {
  postId: string;
  postSlug: string;
  commentCount: number;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  onClick?: () => void;
}

export function CommentCountButton({
  postId,
  postSlug,
  commentCount,
  className,
  iconClassName,
  textClassName,
  onClick,
}: CommentCountButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors',
        className
      )}
    >
      <MessageCircle className={cn('h-4 w-4', iconClassName)} />
      <span className={textClassName}>{commentCount}</span>
    </button>
  );
}

