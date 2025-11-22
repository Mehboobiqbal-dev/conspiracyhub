import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Loader2, Send, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface DraftSummary {
  _id: string;
  title: string;
  type: 'conspiracy' | 'opinion';
  updatedAt: string;
  topicSlug?: string;
  status?: 'draft' | 'scheduled';
}

export function DraftsTray() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const { toast } = useToast();

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/drafts/list', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setDrafts((data.drafts || []).slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to fetch drafts', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDrafts();
    }
  }, [open, fetchDrafts]);

  const handlePublish = async (id: string) => {
    setPublishingId(id);
    try {
      const response = await fetch(`/api/drafts/${id}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish draft');
      }
      toast({
        title: 'Draft published',
        description: 'Redirecting to the new post...',
      });
      window.location.href = `/p/${data.slug}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not publish draft';
      toast({
        title: 'Publish failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="hidden lg:flex">
          <FileText className="h-4 w-4 mr-2" />
          Drafts
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Quick Drafts</SheetTitle>
          <SheetDescription>Jump back into work-in-progress posts.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{drafts.length} drafts</span>
            <Button variant="ghost" size="sm" onClick={fetchDrafts} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
              No drafts yet. Start writing!
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div key={draft._id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold line-clamp-1">
                        {draft.title || 'Untitled draft'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant="outline">{draft.type}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/create?draft=${draft._id}`}>Continue</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePublish(draft._id)}
                      disabled={publishingId === draft._id}
                    >
                      {publishingId === draft._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Publish
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/drafts">View all drafts</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

