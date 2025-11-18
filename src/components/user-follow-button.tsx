'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface UserFollowButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function UserFollowButton({ userId, variant = 'outline', size = 'sm' }: UserFollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user && userId) {
      fetchFollowStatus();
    } else {
      setLoading(false);
    }
  }, [user, userId]);

  const fetchFollowStatus = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/follow-status`, {
        credentials: 'include',
      });
      const data = await response.json();
      setFollowing(data.following || false);
    } catch (error) {
      console.error('Error fetching follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to follow users',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    if (user.id === userId) {
      return;
    }

    setActionLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const response = await fetch(`/api/users/${userId}/follow`, {
        method,
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok) {
        setFollowing(data.following);
        toast({
          title: data.following ? 'Following' : 'Unfollowed',
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Failed to toggle follow');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle follow',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !user || user.id === userId) {
    return null;
  }

  return (
    <Button
      variant={following ? 'default' : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={actionLoading}
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : following ? (
        <UserMinus className="h-4 w-4 mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}

