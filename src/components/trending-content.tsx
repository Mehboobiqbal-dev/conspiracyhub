'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, MessageCircle, Eye, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTextPreview } from '@/lib/utils/html';

interface Post {
  _id: string;
  title: string;
  content?: string;
  excerpt?: string;
  type: 'conspiracy' | 'opinion';
  topicSlug?: string;
  authorName?: string;
  isAIGenerated: boolean;
  upvotes: number;
  commentCount: number;
  views: number;
  tags: string[];
  slug: string;
  createdAt: Date;
}

interface TrendingContentProps {
  posts: Post[];
}

export function TrendingContent({ posts }: TrendingContentProps) {
  const t = useTranslations('post');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold">{t('trending')}</h1>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t('mostPopular')}
          </p>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('noTrendingPosts')}</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post, index) => (
              <Card key={post._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="bg-primary">
                          #{index + 1} {t('trendingBadge')}
                        </Badge>
                        <Badge variant={post.type === 'conspiracy' ? 'destructive' : 'default'}>
                          {post.type}
                        </Badge>
                        {post.isAIGenerated && (
                          <Badge variant="secondary">{t('aiGenerated')}</Badge>
                        )}
                        {post.topicSlug && (
                          <Link href={`/t/${post.topicSlug}`}>
                            <Badge variant="outline">{post.topicSlug}</Badge>
                          </Link>
                        )}
                      </div>
                      <Link href={`/p/${post.slug}`}>
                        <CardTitle className="text-lg sm:text-xl md:text-2xl hover:text-primary transition-colors cursor-pointer break-words">
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
                  <div className="flex items-center gap-3 sm:gap-6 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{post.upvotes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{post.commentCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{post.views} {t('views')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    {post.authorName && (
                      <span className="hidden sm:inline whitespace-nowrap">{t('by')} {post.authorName}</span>
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
    </div>
  );
}


