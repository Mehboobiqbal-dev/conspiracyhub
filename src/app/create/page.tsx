'use client';

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AIAssistButton } from '@/components/ai-assist-button';
import { formatDistanceToNow } from 'date-fns';

const RichEditor = dynamic(() => import('@/components/rich-editor').then((mod) => mod.RichEditor), {
  ssr: false,
});

interface DraftMedia {
  url: string;
  type: 'image' | 'video';
  caption?: string;
  altText?: string;
}

interface DraftResponse {
  draft: {
    _id: string;
    title: string;
    content: string;
    type: 'conspiracy' | 'opinion';
    topicSlug?: string;
    tags: string[];
    excerpt?: string;
    featuredImage?: string;
    media?: DraftMedia[];
    status?: 'draft' | 'scheduled';
    scheduledFor?: string;
    visibility?: 'public' | 'private';
  };
}

function CreatePostPageContent() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'conspiracy' | 'opinion'>('conspiracy');
  const [topicSlug, setTopicSlug] = useState('');
  const [tags, setTags] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaAssets, setMediaAssets] = useState<DraftMedia[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastAutosave, setLastAutosave] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
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
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Fetch topics
    fetch('/api/topics')
      .then(res => res.json())
      .then(data => setTopics(data.topics || []))
      .catch(console.error);
  }, []);

  const loadDraft = useCallback(async (id: string) => {
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
        setExcerpt(data.draft.excerpt || '');
        setFeaturedImage(data.draft.featuredImage || '');
        setMediaAssets(data.draft.media || []);
        setVisibility(data.draft.visibility || 'public');
        setScheduleEnabled(data.draft.status === 'scheduled');
        setScheduledAt(
          data.draft.scheduledFor ? new Date(data.draft.scheduledFor).toISOString().slice(0, 16) : ''
        );
      } else {
        throw new Error('Failed to load draft');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load draft';
      toast({
        title: 'Error loading draft',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setInitializingDraft(false);
    }
  }, [toast]);

  useEffect(() => {
    const draftParam = searchParams.get('draft');
    if (draftParam) {
      loadDraft(draftParam);
    } else {
      setInitializingDraft(false);
    }
  }, [searchParams, loadDraft]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/create');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (initializingDraft) return;
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    setDirty(true);
  }, [title, content, type, topicSlug, tags, featuredImage, excerpt, visibility, scheduleEnabled, scheduledAt, mediaAssets, initializingDraft]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const handleAutosave = useCallback(async (editorContent: string) => {
    if (!user || !editorContent.trim()) return;

    try {
      const response = await fetch('/api/drafts/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          draftId: draftId || undefined, // Convert null to undefined
          title,
          content: editorContent,
          type,
          topicSlug: topicSlug || undefined,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          excerpt: excerpt || undefined,
          featuredImage: featuredImage || undefined,
          media: mediaAssets,
          status: scheduleEnabled ? 'scheduled' : 'draft',
          scheduledFor: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          visibility,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (!draftId && data.draftId) {
          setDraftId(data.draftId);
          router.replace(`/create?draft=${data.draftId}`);
        }
        setLastAutosave(new Date());
      }
    } catch (error) {
      console.error('Autosave failed', error);
    }
  }, [draftId, excerpt, featuredImage, mediaAssets, router, scheduleEnabled, scheduledAt, tags, title, topicSlug, type, user, visibility]);

  const handleMediaInsert = useCallback((asset: DraftMedia) => {
    setMediaAssets((prev) => [asset, ...prev].slice(0, 10));
  }, []);

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

    if (scheduleEnabled) {
      if (!scheduledAt) {
        toast({
          title: 'Schedule time required',
          description: 'Select a future time to schedule this post.',
          variant: 'destructive',
        });
        return;
      }
      const scheduleDate = new Date(scheduledAt);
      if (scheduleDate.getTime() < Date.now() + 60 * 1000) {
        toast({
          title: 'Schedule time invalid',
          description: 'Pick a time at least 1 minute in the future.',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const publishAt = scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;

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
            excerpt: excerpt || undefined,
            featuredImage: featuredImage || undefined,
            media: mediaAssets,
            publishAt,
            visibility,
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

      setDirty(false);
      router.push(`/p/${data.post.slug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create post';
      toast({
        title: 'Error',
        description: message,
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
        excerpt: excerpt || undefined,
        featuredImage: featuredImage || undefined,
        media: mediaAssets,
        status: scheduleEnabled ? 'scheduled' : 'draft',
        scheduledFor: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        visibility,
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
      setDirty(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save draft';
      toast({
        title: 'Error',
        description: message,
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
                  <RichEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Write your theory or opinion..."
                    enableAutosave
                    onAutosave={handleAutosave}
                    onMediaInsert={handleMediaInsert}
                  />
                </div>
                {lastAutosave && (
                  <p className="text-xs text-muted-foreground">
                    Autosaved {formatDistanceToNow(lastAutosave, { addSuffix: true })}
                  </p>
                )}
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

              <div className="space-y-2">
                <Label htmlFor="featuredImage">Featured Image (Optional)</Label>
                <Input
                  id="featuredImage"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Displayed on previews, topic feeds, and social cards.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">SEO Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="150-160 character summary shown on search and social previews"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {excerpt.length || 0} / 160 characters
                </p>
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Label className="text-base">Visibility</Label>
                    <p className="text-xs text-muted-foreground">
                      Public posts are visible to everyone; private posts stay hidden until you share the link.
                    </p>
                  </div>
                  <Select value={visibility} onValueChange={(value: 'public' | 'private') => setVisibility(value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                  <div>
                    <Label className="text-base">Schedule publication</Label>
                    <p className="text-xs text-muted-foreground">
                      Queue this post to drop at a future time.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      disabled={!scheduleEnabled}
                      min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
                    />
                  </div>
                </div>
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
                <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                  Preview
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {dirty ? 'Unsaved changes' : 'All changes saved'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>SSR-style preview of your post metadata.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <p className="text-xs uppercase text-muted-foreground mb-2">{type}</p>
              <h2 className="text-2xl font-bold mb-2">{title || 'Untitled draft'}</h2>
              <p className="text-muted-foreground">
                {excerpt || content.replace(/<[^>]+>/g, '').slice(0, 160)}
              </p>
            </div>
            {featuredImage && (
              <div className="relative w-full h-64">
                <Image
                  src={featuredImage}
                  alt="Featured preview"
                  fill
                  unoptimized
                  className="object-cover rounded-lg border"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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

