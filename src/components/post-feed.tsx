'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, MessageCircle, Eye, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  _id: string;
  title: string;
  content: string;
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

interface PostFeedProps {
  initialPosts?: Post[];
  feedType?: 'public' | 'personalized';
  topicSlug?: string;
}

export function PostFeed({ initialPosts, feedType = 'public', topicSlug }: PostFeedProps = {}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts || []);
  const [loading, setLoading] = useState(!initialPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState('newest');
  const [type, setType] = useState<'all' | 'conspiracy' | 'opinion'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        sort,
        ...(type !== 'all' && { type }),
        ...(topicSlug && { topic: topicSlug }),
      });

      const endpoint = feedType === 'personalized' 
        ? `/api/feed/personalized?${params}`
        : `/api/posts?${params}`;

      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.posts) {
        if (append) {
          setPosts(prev => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setPagination(data.pagination || null);
        setHasMore(data.pagination ? pageNum < data.pagination.totalPages : false);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, type, feedType, topicSlug]);

  useEffect(() => {
    if (!initialPosts) {
      setPage(1);
      fetchPosts(1, false);
    }
  }, [sort, type, feedType, topicSlug]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="controversial">Controversial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(value: 'all' | 'conspiracy' | 'opinion') => setType(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="conspiracy">Conspiracy</SelectItem>
            <SelectItem value="opinion">Opinion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
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
                          <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                            {post.topicSlug}
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <Link href={`/p/${post.slug}`}>
                      <CardTitle className="text-2xl hover:text-primary transition-colors cursor-pointer">
                        {post.title}
                      </CardTitle>
                    </Link>
                    {post.excerpt && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {post.excerpt}
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
                  {post.authorName && (
                    <span>by {post.authorName}</span>
                  )}
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

