'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AIAssistButton } from '@/components/ai-assist-button';
import { cn } from '@/lib/utils';

const RichEditor = dynamic(() => import('@/components/rich-editor').then((mod) => mod.RichEditor), {
  ssr: false,
});

interface DraftResponse {
  draft: {
    _id: string;
    title: string;
    content: string;
    type: 'conspiracy' | 'opinion';
    topicSlug?: string;
    tags: string[];
  };
}

function CreatePostPageContent() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'conspiracy' | 'opinion'>('conspiracy');
  const [topicSlug, setTopicSlug] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [initializingDraft, setInitializingDraft] = useState(true);
  const [topics, setTopics] = useState<Array<{ _id: string; name: string; slug: string }>>([]);
  const OPTIONAL_TOPIC_VALUE = useMemo(() => '__no_topic__', []);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Fetch topics
    fetch('/api/topics')
      .then(res => res.json())
      .then(data => setTopics(data.topics || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (draftParam) {
      loadDraft(draftParam);
    } else {
      setInitializingDraft(false);
    }
  }, [searchParams]);

  const loadDraft = async (id: string) => {
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        credentials: 'include',
      });
      const data: DraftResponse = await response.json();
      if (response.ok) {
        setDraftId(data.draft._id);
        setTitle(data.draft.title || '');
        setContent(data.draft.content || '');
        setType(data.draft.type);
        setTopicSlug(data.draft.topicSlug || '');
        setTags(data.draft.tags.join(', '));
      } else {
        throw new Error('Failed to load draft');
      }
    } catch (error: any) {
      toast({
        title: 'Error loading draft',
        description: error.message || 'Failed to load draft',
        variant: 'destructive',
      });
    } finally {
      setInitializingDraft(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/create');
    }
  }, [user, authLoading, router]);

  if (authLoading || initializingDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const handlePublish = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create a post',
        variant: 'destructive',
      });
      router.push('/login?redirect=/create');
      return;
    }

    if (title.length < 5) {
      toast({
        title: 'Title too short',
        description: 'Title must be at least 5 characters',
        variant: 'destructive',
      });
      return;
    }

    const plainContent = content.replace(/<[^>]*>/g, '').trim();

    if (plainContent.length < 100) {
      toast({
        title: 'Content too short',
        description: 'Content must be at least 100 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          content,
          type,
          topicSlug: topicSlug || undefined,
          tags: tagArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      toast({
        title: 'Success',
        description: 'Post created successfully!',
      });

      router.push(`/p/${data.post.slug}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      router.push('/login?redirect=/create');
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Write something before saving a draft',
        variant: 'destructive',
      });
      return;
    }

    setSavingDraft(true);
    try {
      const payload = {
        title,
        content,
        type,
        topicSlug: topicSlug || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      const response = await fetch(draftId ? `/api/drafts/${draftId}` : '/api/drafts', {
        method: draftId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save draft');
      }

      if (!draftId) {
        setDraftId(data.draft._id);
        router.replace(`/create?draft=${data.draft._id}`);
      }

      toast({
        title: 'Draft saved',
        description: 'You can revisit this draft anytime from the Drafts page',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New Post</CardTitle>
            <CardDescription>
              Share your conspiracy theory or opinion with the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Post Type</Label>
                <Select value={type} onValueChange={(value: 'conspiracy' | 'opinion') => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conspiracy">Conspiracy Theory</SelectItem>
                    <SelectItem value="opinion">Opinion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a compelling title..."
                  required
                  minLength={5}
                  maxLength={200}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Content *</Label>
                  <AIAssistButton
                    onContentGenerated={(generated) => setContent((prev) => `${prev}\n${generated}`)}
                    topic={title || topicSlug || undefined}
                    type={type}
                  />
                </div>
                <div className="border rounded-lg">
                  <RichEditor content={content} onChange={setContent} placeholder="Write your theory or opinion..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Select
                  value={topicSlug || OPTIONAL_TOPIC_VALUE}
                  onValueChange={(value) =>
                    setTopicSlug(value === OPTIONAL_TOPIC_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OPTIONAL_TOPIC_VALUE}>No topic</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic._id} value={topic.slug}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Separate tags with commas
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button onClick={handlePublish} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    'Publish'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                >
                  {savingDraft ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : draftId ? (
                    'Update Draft'
                  ) : (
                    'Save Draft'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/drafts')}
                >
                  View Drafts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <CreatePostPageContent />
    </Suspense>
  );
}

