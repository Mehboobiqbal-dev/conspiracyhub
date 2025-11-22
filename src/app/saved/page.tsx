'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, MessageCircle, Eye, Clock, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { getTextPreview } from '@/lib/utils/html';

interface Post {
  _id: string;
  title: string;
  content?: string;
  type: 'conspiracy' | 'opinion';
  topicSlug?: string;
  authorName?: string;
  isAIGenerated: boolean;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  views: number;
  tags: string[];
  slug: string;
  excerpt?: string;
  createdAt: Date;
}

export default function SavedPostsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/saved');
      return;
    }

    if (user) {
      fetchSavedPosts();
    }
  }, [user, authLoading, router]);

  const fetchSavedPosts = async () => {
    try {
      const response = await fetch('/api/posts/saved', {
        credentials: 'include',
      });
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    } finally {
      setLoading(false);
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
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-headline font-bold">Saved Posts</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Posts you've saved for later
          </p>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No saved posts yet.</p>
                <Link href="/">
                  <Badge className="mt-4 cursor-pointer">Browse Posts</Badge>
                </Link>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={post.type === 'conspiracy' ? 'destructive' : 'default'}>
                          {post.type}
                        </Badge>
                        {post.isAIGenerated && (
                          <Badge variant="secondary">AI Generated</Badge>
                        )}
                        {post.topicSlug && (
                          <Link href={`/t/${post.topicSlug}`}>
                            <Badge variant="outline">{post.topicSlug}</Badge>
                          </Link>
                        )}
                      </div>
                      <Link href={`/p/${post.slug}`}>
                        <CardTitle className="text-2xl hover:text-primary transition-colors cursor-pointer">
                          {post.title}
                        </CardTitle>
                      </Link>
                      {(post.excerpt || post.content) && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {getTextPreview(post.excerpt || post.content || '', 200)}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="h-4 w-4" />
                      <span>{post.upvotes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.commentCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

