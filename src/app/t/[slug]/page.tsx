import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/db/mongodb';
import { Topic } from '@/lib/models/topic';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TopicFollowButton } from '@/components/topic-follow-button';
import { PostFeed } from '@/components/post-feed';

interface PageProps {
  params: { slug: string } | Promise<{ slug: string }>;
}

async function getTopicData(slug: string) {
  try {
    const topicsCollection = await getCollection<Topic>('topics');
    const topic = await topicsCollection.findOne({ slug });

    if (!topic) return null;

    const postsCollection = await getCollection<Post>('posts');
    const posts = await postsCollection
      .find({ topicSlug: slug, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return {
      topic: {
        ...topic,
        _id: topic._id?.toString(),
      },
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
    };
  } catch (error) {
    console.error('Error fetching topic:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTopicData(slug);
  
  if (!data) {
    return {
      title: 'Topic Not Found',
    };
  }

  const { topic } = data;
  
  return {
    title: `${topic.name} - Conspiracy & Opinion Platform`,
    description: topic.description || `Explore ${topic.name} conspiracy theories and opinions`,
    openGraph: {
      title: topic.name,
      description: topic.description || `Explore ${topic.name} conspiracy theories and opinions`,
      type: 'website',
    },
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getTopicData(slug);

  if (!data) {
    notFound();
  }

  const { topic, posts } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          {' / '}
          <Link href="/topics" className="hover:text-foreground">Topics</Link>
          {' / '}
          <span className="text-foreground">{topic.name}</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-headline font-bold mb-2">{topic.name}</h1>
              {topic.description && (
                <p className="text-muted-foreground text-lg">{topic.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{topic.postCount} posts</span>
                <span>{topic.followerCount} followers</span>
              </div>
            </div>
            <TopicFollowButton topicSlug={topic.slug} initialFollowerCount={topic.followerCount} />
          </div>
        </div>

        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts in this topic yet.</p>
                <Link href="/create">
                  <Badge className="mt-4 cursor-pointer">Create First Post</Badge>
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
