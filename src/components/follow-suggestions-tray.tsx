import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserFollowButton } from '@/components/user-follow-button';
import { Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface FollowSuggestion {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  followerCount: number;
}

export function FollowSuggestionsTray() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/suggestions', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setSuggestions(data.suggestions || []);
      } else {
        throw new Error(data.error || 'Failed to load suggestions');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load suggestions';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden lg:flex">
          <Users className="h-4 w-4 mr-2" />
          Suggestions
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Who to follow</SheetTitle>
          <SheetDescription>
            Discover creators with active conspiracy & opinion threads.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{suggestions.length} recommendations</span>
            <Button variant="ghost" size="sm" onClick={fetchSuggestions} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
              No suggestions right now. Follow topics to get tailored picks.
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {suggestion.avatar ? (
                      <AvatarImage src={suggestion.avatar} alt={suggestion.name} />
                    ) : (
                      <AvatarFallback>{suggestion.name.charAt(0).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Link href={`/u/${suggestion.id}`} className="font-semibold hover:underline">
                      {suggestion.name}
                    </Link>
                    {suggestion.followerCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {suggestion.followerCount.toLocaleString()} followers
                      </p>
                    )}
                    {suggestion.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {suggestion.bio}
                      </p>
                    )}
                  </div>
                  <UserFollowButton userId={suggestion.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

