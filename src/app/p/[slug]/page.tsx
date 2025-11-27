import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';
import { User } from '@/lib/models/user';
import { Comment } from '@/lib/models/comment';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, Eye, Clock, User as UserIcon } from 'lucide-react';
import { CommentModalButton } from '@/components/comment-modal-button';
import { CommentSection } from '@/components/comment-section';
import { PostVoteButtons } from '@/components/post-vote-buttons';
import { PostActions } from '@/components/post-actions';
import { PostMenu } from '@/components/post-menu';
import { RelativeTime } from '@/components/relative-time';
import { PostTranslator } from '@/components/post-translator';

interface PageProps {
  params: { slug: string } | Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  try {
    const postsCollection = await getCollection<Post>('posts');
    const post = await postsCollection.findOne({ slug, status: 'published' });

    if (!post) return null;

    // Increment view count (fire and forget)
    postsCollection.updateOne(
      { _id: post._id },
      { $inc: { views: 1 } }
    ).catch(console.error);

    let topic = null;
    if (post.topicId) {
      const topicsCollection = await getCollection<Topic>('topics');
      topic = await topicsCollection.findOne({ _id: post.topicId });
    }

    let author = null;
    if (post.authorId) {
      const usersCollection = await getCollection<User>('users');
      author = await usersCollection.findOne({ _id: post.authorId });
    }

    // Get comments
    const commentsCollection = await getCollection<Comment>('comments');
    const comments = await commentsCollection
      .find({ postId: post._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return {
      post: {
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      },
      topic: topic ? {
        _id: topic._id?.toString(),
        name: topic.name,
        slug: topic.slug,
      } : null,
      author: author ? {
        _id: author._id?.toString(),
        name: author.name,
        avatar: author.avatar,
      } : null,
      comments: comments.map(comment => ({
        ...comment,
        _id: comment._id?.toString(),
        postId: comment.postId?.toString(),
        authorId: comment.authorId?.toString(),
        parentId: comment.parentId?.toString(),
      })),
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPost(slug);
  
  if (!data) {
    return {
      title: 'Post Not Found',
    };
  }

  const { post } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://Elch.com';
  
  return {
    title: `${post.title} | Elch`,
    description: post.excerpt || post.content.substring(0, 160),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content.substring(0, 160),
      type: 'article',
      publishedTime: post.createdAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
      url: `${baseUrl}/p/${post.slug}`,
    },
    alternates: {
      canonical: `${baseUrl}/p/${post.slug}`,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPost(slug);

  if (!data) {
    notFound();
  }

  const { post, topic, author, comments } = data;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://Elch.com';

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.content.substring(0, 160),
    author: {
      '@type': 'Person',
      name: post.authorName || 'Anonymous',
    },
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt?.toISOString() || post.createdAt.toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/p/${post.slug}`,
    },
    keywords: post.tags?.join(', '),
  };

  return (
    <div className="full-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground overflow-x-auto">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Link href="/" className="hover:text-foreground">Home</Link>
            {topic && (
              <>
                <span> / </span>
                <Link href={`/t/${topic.slug}`} className="hover:text-foreground">
                  {topic.name}
                </Link>
              </>
            )}
            <span> / </span>
            <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{post.title}</span>
          </div>
        </nav>

        <article>
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant={post.type === 'conspiracy' ? 'destructive' : 'default'} className="text-xs">
                      {post.type}
                    </Badge>
                    {post.isAIGenerated && (
                      <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                    )}
                    {topic && (
                      <Link href={`/t/${topic.slug}`}>
                        <Badge variant="outline" className="text-xs">{topic.name}</Badge>
                      </Link>
                    )}
                  </div>
                  <CardTitle className="text-xl sm:text-2xl md:text-3xl mb-2 break-words">{post.title}</CardTitle>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <RelativeTime date={post.createdAt} />
                      </div>
                      {author && (
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <Link href={`/u/${author._id}`} className="hover:text-foreground whitespace-nowrap">
                            {author.name}
                          </Link>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="whitespace-nowrap">{post.views} views</span>
                      </div>
                    </div>
                    <PostMenu postId={post._id} postSlug={post.slug} authorId={post.authorId} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <PostTranslator content={post.content} originalLanguage="en" />
              <div 
                id="post-content"
                className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none mb-4 sm:mb-6 prose-img:rounded-lg prose-img:my-4 prose-video:rounded-lg prose-video:my-4 prose-figure:my-4 prose-img:max-w-full"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-4 border-t">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <PostVoteButtons
                    postId={post._id}
                    postSlug={post.slug}
                    initialUpvotes={post.upvotes}
                    initialDownvotes={post.downvotes}
                  />
                  <CommentModalButton
                    postId={post._id}
                    postSlug={post.slug}
                    commentCount={post.commentCount}
                  />
                </div>
                <PostActions postId={post._id} postSlug={post.slug} />
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card id="comments">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <CommentSection postId={post._id} postSlug={post.slug} />
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
}
