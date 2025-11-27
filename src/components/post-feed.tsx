'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, MessageCircle, Eye, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTextPreview } from '@/lib/utils/html';
import { PostCard } from '@/components/post-card';

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
  const t = useTranslations('filters');
  const tPost = useTranslations('post');
  const tCommon = useTranslations('common');
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
    } else {
      // If initialPosts provided, use them and set pagination
      setPosts(initialPosts);
      setHasMore(false);
    }
  }, [sort, type, feedType, topicSlug, fetchPosts, initialPosts]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  };

  if (loading && posts.length === 0) {
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
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="flex gap-2 sm:gap-4 items-center flex-wrap">
        <Select value={sort} onValueChange={(value) => {
          setSort(value);
          setPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('sortBy')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('newest')}</SelectItem>
            <SelectItem value="hot">{t('hot')}</SelectItem>
            <SelectItem value="trending">{t('trending')}</SelectItem>
            <SelectItem value="popular">{t('mostPopular')}</SelectItem>
            <SelectItem value="top">{t('top')}</SelectItem>
            <SelectItem value="controversial">{t('controversial')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(value: 'all' | 'conspiracy' | 'opinion') => {
          setType(value);
          setPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={t('filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            <SelectItem value="conspiracy">{t('conspiracy')}</SelectItem>
            <SelectItem value="opinion">{t('opinion')}</SelectItem>
          </SelectContent>
        </Select>

        {pagination && (
          <div className="text-xs sm:text-sm text-muted-foreground ml-auto w-full sm:w-auto text-center sm:text-left">
            {tPost('showing')} {posts.length} {tPost('of')} {pagination.total} {tPost('posts')}
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{tPost('noPosts')}</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              tPost('loadMore')
            )}
          </Button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center text-muted-foreground py-4">
          {tPost('noMorePosts')}
        </div>
      )}
    </div>
  );
}

