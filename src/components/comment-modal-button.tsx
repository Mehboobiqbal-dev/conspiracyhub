'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface CommentModalButtonProps {
  postId: string;
  postSlug: string;
  commentCount: number;
}

export function CommentModalButton({ postId, postSlug, commentCount }: CommentModalButtonProps) {
  const [isScrolling, setIsScrolling] = useState(false);

  const handleClick = () => {
    const commentsEl = document.getElementById('comments');

    if (commentsEl) {
      setIsScrolling(true);
      commentsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Reset the loading state after a short delay
      setTimeout(() => setIsScrolling(false), 600);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={isScrolling}>
      <MessageCircle className="h-4 w-4 mr-1" />
      {commentCount} Comments
    </Button>
  );
}

