'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Clock, Languages, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTextPreview } from '@/lib/utils/html';
import Swal from 'sweetalert2';
import { CommentCountButton } from '@/components/comment-count-button';
import { CommentSection } from '@/components/comment-section';
import { PostVoteButtons } from '@/components/post-vote-buttons';

interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  type: 'conspiracy' | 'opinion';
  upvotes: number;
  downvotes?: number;
  commentCount: number;
  views: number;
  createdAt: Date | string;
  authorName?: string;
  topicSlug?: string;
  tags?: string[];
  isAIGenerated?: boolean;
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const t = useTranslations('post');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleTranslate = async () => {
    if (translatedContent) {
      setShowOriginal(!showOriginal);
      return;
    }

    setIsTranslating(true);
    try {
      const fullContent = post.content || post.excerpt || '';
      
      if (!fullContent || fullContent.trim().length === 0) {
        throw new Error('No content to translate');
      }

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullContent,
          targetLanguage: locale, // Use current locale
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If API returns error but includes translatedText as fallback, use it
        if (data.translatedText) {
          setTranslatedContent(data.translatedText);
          setShowOriginal(false);
          setShowFullContent(true);
          return;
        }
        throw new Error(data.error || 'Translation failed');
      }

      if (data.translatedText) {
        setTranslatedContent(data.translatedText);
        setShowOriginal(false);
        setShowFullContent(true);
      } else {
        throw new Error('No translation received');
      }
    } catch (error) {
      console.error('Translation error:', error);
      Swal.fire({
        icon: 'error',
        title: t('translationError'),
        text: error instanceof Error ? error.message : 'Unknown error',
        confirmButtonText: tCommon('close'),
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const displayContent = showOriginal 
    ? (post.excerpt || post.content || '')
    : (translatedContent || post.excerpt || post.content || '');

  const previewText = showFullContent 
    ? displayContent 
    : getTextPreview(displayContent, 200);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={post.type === 'conspiracy' ? 'destructive' : 'default'} className="text-xs">
                {post.type}
              </Badge>
              {post.isAIGenerated && (
                <Badge variant="secondary" className="text-xs">{t('aiGenerated')}</Badge>
              )}
              {post.topicSlug && (
                <Link href={`/t/${post.topicSlug}`}>
                  <Badge variant="outline" className="hover:bg-accent cursor-pointer text-xs">
                    {post.topicSlug}
                  </Badge>
                </Link>
              )}
            </div>
            <Link href={`/p/${post.slug}`}>
              <CardTitle className="text-lg sm:text-xl md:text-2xl hover:text-primary transition-colors cursor-pointer break-words">
                {post.title}
              </CardTitle>
            </Link>
            {(post.excerpt || post.content) && (
              <div className="mt-2">
                {showFullContent ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: displayContent }}
                    className="prose prose-sm max-w-none dark:prose-invert prose-img:rounded-lg prose-img:my-4 prose-video:rounded-lg prose-video:my-4 prose-figure:my-4 prose-img:max-w-full prose-video:max-w-full prose-video:w-full prose-video:h-auto"
                  />
                ) : (
                  <CardDescription className="line-clamp-2">
                    {previewText}
                  </CardDescription>
                )}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('translating')}
                      </>
                    ) : translatedContent ? (
                      showOriginal ? t('showTranslation') : t('showOriginal')
                    ) : (
                      <>
                        <Languages className="h-4 w-4 mr-2" />
                        {t('translate')}
                      </>
                    )}
                  </Button>
                  {!showFullContent && (post.content || post.excerpt) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullContent(true)}
                    >
                      {tCommon('readMore') || 'Read More'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 sm:gap-6 text-sm text-muted-foreground flex-wrap">
          <PostVoteButtons
            postId={post._id}
            postSlug={post.slug}
            initialUpvotes={post.upvotes}
            initialDownvotes={post.downvotes ?? 0}
          />
          <CommentCountButton
            postId={post._id}
            postSlug={post.slug}
            commentCount={post.commentCount}
            className="text-sm text-muted-foreground"
            onClick={() => setShowComments((prev) => !prev)}
          />
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{post.views}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{formatDistanceToNow(post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt), { addSuffix: true })}</span>
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

        {showComments && (
          <div className="mt-4 border-t pt-4">
            <CommentSection postId={post._id} postSlug={post.slug} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

