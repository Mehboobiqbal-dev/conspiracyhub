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
import { ArrowUp, MessageCircle, Eye, Clock, User as UserIcon } from 'lucide-react';
import { CommentSection } from '@/components/comment-section';
import { PostVoteButtons } from '@/components/post-vote-buttons';
import { PostActions } from '@/components/post-actions';
import { PostMenu } from '@/components/post-menu';
import { RelativeTime } from '@/components/relative-time';

interface PageProps {
  params: { slug: string };
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
  const data = await getPost(params.slug);
  
  if (!data) {
    return {
      title: 'Post Not Found',
    };
  }

  const { post } = data;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conspiracyhub.com';
  
  return {
    title: `${post.title} | ConspiracyHub`,
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
  const data = await getPost(params.slug);

  if (!data) {
    notFound();
  }

  const { post, topic, author, comments } = data;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://conspiracyhub.com';

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
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          {topic && (
            <>
              {' / '}
              <Link href={`/t/${topic.slug}`} className="hover:text-foreground">
                {topic.name}
              </Link>
            </>
          )}
          {' / '}
          <span className="text-foreground">{post.title}</span>
        </nav>

        <article>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={post.type === 'conspiracy' ? 'destructive' : 'default'}>
                      {post.type}
                    </Badge>
                    {post.isAIGenerated && (
                      <Badge variant="secondary">AI Generated</Badge>
                    )}
                    {topic && (
                      <Link href={`/t/${topic.slug}`}>
                        <Badge variant="outline">{topic.name}</Badge>
                      </Link>
                    )}
                  </div>
                  <CardTitle className="text-3xl mb-2">{post.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <RelativeTime date={post.createdAt} />
                      </div>
                      {author && (
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-4 w-4" />
                          <Link href={`/u/${author._id}`} className="hover:text-foreground">
                            {author.name}
                          </Link>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.views} views</span>
                      </div>
                    </div>
                    <PostMenu postId={post._id} postSlug={post.slug} authorId={post.authorId} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg dark:prose-invert max-w-none mb-6">
                <div className="whitespace-pre-wrap">{post.content}</div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                  <PostVoteButtons
                    postId={post._id}
                    postSlug={post.slug}
                    initialUpvotes={post.upvotes}
                    initialDownvotes={post.downvotes}
                  />
                  <Button variant="outline" size="sm" disabled>
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {post.commentCount} Comments
                  </Button>
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
          <Card>
            <CardContent className="pt-6">
              <CommentSection postId={post._id} postSlug={post.slug} />
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
}
