'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PostVoteButtonsProps {
  postId: string;
  postSlug: string;
  initialUpvotes: number;
  initialDownvotes: number;
}

export function PostVoteButtons({
  postId,
  postSlug,
  initialUpvotes,
  initialDownvotes,
}: PostVoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Fetch user's vote status
    if (user) {
      fetch(`/api/posts/${postSlug}/vote-status`, {
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          // Sync counts from server so they persist across refresh
          if (typeof data.upvotes === 'number') {
            setUpvotes(data.upvotes);
          }
          if (typeof data.downvotes === 'number') {
            setDownvotes(data.downvotes);
          }
          if (data.userVote) {
            setUserVote(data.userVote);
          }
        })
        .catch(console.error);
    }
  }, [user, postSlug]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (!user) {
      const result = await Swal.fire({
        title: 'Login required',
        text: 'You need to log in to vote on posts.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Login',
        cancelButtonText: 'Cancel',
      });

      if (result.isConfirmed) {
        router.push(`/login?redirect=/p/${postSlug}`);
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          postId,
          type,
        }),
      });

      const data = await response.json();
      console.log('[PostVoteButtons] vote response', {
        postId,
        type,
        status: response.status,
        data,
      });

      if (response.ok) {
        // Update vote state
        if (data.voted) {
          // User voted
          if (userVote === type) {
            // Toggle off
            setUserVote(null);
            if (type === 'upvote') {
              setUpvotes(upvotes - 1);
            } else {
              setDownvotes(downvotes - 1);
            }
          } else {
            // New vote or changed vote
            if (userVote === 'upvote') {
              setUpvotes(upvotes - 1);
            } else if (userVote === 'downvote') {
              setDownvotes(downvotes - 1);
            }
            
            setUserVote(type);
            if (type === 'upvote') {
              setUpvotes(upvotes + 1);
            } else {
              setDownvotes(downvotes + 1);
            }
          }
        } else {
          // Vote removed
          setUserVote(null);
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'Failed to vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote('upvote')}
        disabled={loading}
        className={cn(
          userVote === 'upvote' && 'bg-primary text-primary-foreground'
        )}
      >
        <ArrowUp className="h-4 w-4 mr-1" />
        {upvotes}
      </Button>
      <div className="text-sm font-semibold min-w-[2rem] text-center">
        {score > 0 ? '+' : ''}{score}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote('downvote')}
        disabled={loading}
        className={cn(
          userVote === 'downvote' && 'bg-destructive text-destructive-foreground'
        )}
      >
        <ArrowDown className="h-4 w-4 mr-1" />
        {downvotes}
      </Button>
    </div>
  );
}

