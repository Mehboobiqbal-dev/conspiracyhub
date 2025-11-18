import { Metadata } from 'next';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { UserStats } from '@/lib/models/user-activity';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, MessageCircle, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ObjectId } from 'mongodb';
import { PostFeed } from '@/components/post-feed';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Your Feed - ConspiracyHub',
  description: 'Personalized feed based on your followed topics',
};

export const dynamic = 'force-dynamic';

async function getUserFeed() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return null;
    }

    let userId = null;
    try {
      const payload = verifyAccessToken(accessToken);
      userId = payload.userId;
    } catch {
      return null;
    }

    const statsCollection = await getCollection<UserStats>('user_stats');
    const userStats = await statsCollection.findOne({ userId: new ObjectId(userId) });

    if (!userStats || userStats.followedTopics.length === 0) {
      return { posts: [], followedTopics: [] };
    }

    const postsCollection = await getCollection<Post>('posts');
    const posts = await postsCollection
      .find({
        topicId: { $in: userStats.followedTopics },
        status: 'published',
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return {
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
      followedTopics: userStats.followedTopics.map(id => id.toString()),
    };
  } catch (error) {
    console.error('Error fetching user feed:', error);
    return null;
  }
}

export default async function FeedPage() {
  const feedData = await getUserFeed();

  if (!feedData) {
    redirect('/login?redirect=/feed');
  }

  const { posts, followedTopics } = feedData;

  if (followedTopics.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-4xl font-headline font-bold mb-4">Your Feed</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Follow topics to see posts in your personalized feed
              </p>
              <Link href="/topics">
                <Badge className="cursor-pointer">Browse Topics</Badge>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-4xl font-headline font-bold mb-4">Your Feed</h1>
        <p className="text-muted-foreground mb-6">
          Posts from topics you follow
        </p>
        <PostFeed initialPosts={posts} />
      </div>
    </div>
  );
}

