'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTextPreview } from '@/lib/utils/html';
import { CommentCountButton } from '@/components/comment-count-button';

interface Post {
  _id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  type: 'conspiracy' | 'opinion';
  upvotes: number;
  commentCount: number;
  views: number;
  createdAt: Date | string;
  topicSlug?: string;
  isAIGenerated?: boolean;
}

interface SearchPostCardProps {
  post: Post;
}

export function SearchPostCard({ post }: SearchPostCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
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
          <CommentCountButton
            postId={post._id}
            postSlug={post.slug}
            commentCount={post.commentCount}
            className="text-sm text-muted-foreground"
          />
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
  );
}

