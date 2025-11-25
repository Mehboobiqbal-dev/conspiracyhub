'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Share2, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PostActionsProps {
  postId: string;
  postSlug: string;
}

export function PostActions({ postId, postSlug }: PostActionsProps) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check if post is saved (you can implement this API endpoint)
    // For now, we'll skip this check
  }, [postId, user]);

  const handleSave = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to save posts',
        variant: 'destructive',
      });
      router.push(`/login?redirect=/p/${postSlug}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${postSlug}/save`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSaved(data.saved);
        toast({
          title: data.saved ? 'Post saved' : 'Post unsaved',
          description: data.message,
        });
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: 'Error',
        description: 'Failed to save post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${postSlug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post on Elch',
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Post link copied to clipboard',
      });
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to report content',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postSlug}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'other',
          details: 'User reported this content',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Report submitted',
          description: 'Thank you for reporting. We will review this content.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit report',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={!user || loading}
        className={cn(saved && 'bg-primary/10')}
      >
        <Bookmark className={cn('h-4 w-4 mr-1', saved && 'fill-current')} />
        {saved ? 'Saved' : 'Save'}
      </Button>
      <Button variant="ghost" size="sm" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-1" />
        Share
      </Button>
      <Button variant="ghost" size="sm" onClick={handleReport} disabled={!user}>
        <Flag className="h-4 w-4 mr-1" />
        Report
      </Button>
    </div>
  );
}

