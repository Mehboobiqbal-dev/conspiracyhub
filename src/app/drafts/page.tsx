'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface Draft {
  _id: string;
  title: string;
  content: string;
  type: 'conspiracy' | 'opinion';
  topicSlug?: string;
  tags: string[];
  updatedAt: string;
  createdAt: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/drafts');
    } else if (user) {
      fetchDrafts();
    }
  }, [user, authLoading, router]);

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/drafts/list', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: 'Draft deleted',
          description: 'Your draft has been deleted',
        });
        fetchDrafts();
      } else {
        throw new Error('Failed to delete draft');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete draft',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2">My Drafts</h1>
            <p className="text-muted-foreground">
              Manage your saved drafts
            </p>
          </div>
          <Button asChild>
            <Link href="/create">
              <Edit className="h-4 w-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>

        {drafts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No drafts yet</p>
              <Button asChild>
                <Link href="/create">Create Your First Draft</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {drafts.map((draft) => (
              <Card key={draft._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">
                        {draft.title || 'Untitled Draft'}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{draft.type}</Badge>
                          {draft.topicSlug && (
                            <Badge variant="secondary">{draft.topicSlug}</Badge>
                          )}
                          <span className="text-xs">
                            Updated {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/create?draft=${draft._id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(draft._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {draft.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

