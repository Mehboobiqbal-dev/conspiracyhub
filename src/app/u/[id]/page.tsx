import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollection } from '@/lib/db/mongodb';
import { User } from '@/lib/models/user';
import { Post } from '@/lib/models/post';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUp, MessageCircle, Eye, Clock, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ObjectId } from 'mongodb';
import { Trophy, TrendingUp, MessageSquare, FileText } from 'lucide-react';
import { UserFollowButton } from '@/components/user-follow-button';
import { UserFollow } from '@/lib/models/user-follow';
import { UserStats } from '@/lib/models/user-activity';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getUserProfile(userId: string) {
  try {
    // Validate userId before creating ObjectId
    if (!userId || userId === 'undefined' || !ObjectId.isValid(userId)) {
      console.error('Invalid userId:', userId);
      return null;
    }

    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) return null;

    const postsCollection = await getCollection<Post>('posts');
    const commentsCollection = await getCollection('comments');
    const followsCollection = await getCollection<UserFollow>('user_follows');
    const statsCollection = await getCollection<UserStats>('user_stats');
    
    const posts = await postsCollection
      .find({ authorId: user._id, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const comments = await commentsCollection
      .find({ authorId: user._id })
      .count();

    const followerCount = await followsCollection.countDocuments({ followingId: user._id });
    const followingCount = await followsCollection.countDocuments({ followerId: user._id });

    const userStats = await statsCollection.findOne({ userId: user._id });
    const karma = userStats?.karma || 0;

    return {
      user: {
        _id: user._id?.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      stats: {
        postCount: posts.length,
        commentCount: comments,
        karma,
        followerCount,
        followingCount,
      },
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  if (!id || id === 'undefined') {
    return {
      title: 'User Not Found',
    };
  }
  
  const data = await getUserProfile(id);
  
  if (!data) {
    return {
      title: 'User Not Found',
    };
  }

  const { user } = data;
  
  return {
    title: `${user.name} | ConspiracyHub`,
    description: user.bio || `Posts by ${user.name}`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  
  if (!id || id === 'undefined') {
    notFound();
  }
  
  const data = await getUserProfile(id);

  if (!data) {
    notFound();
  }

  const { user, posts, stats } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-2xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-3xl">{user.name}</CardTitle>
                  <UserFollowButton userId={user._id} />
                </div>
                {user.bio && (
                  <CardDescription className="text-base mt-2">
                    {user.bio}
                  </CardDescription>
                )}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.karma}</div>
                      <div className="text-xs text-muted-foreground">Karma</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.postCount}</div>
                      <div className="text-xs text-muted-foreground">Posts</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.commentCount}</div>
                      <div className="text-xs text-muted-foreground">Comments</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{new Date(user.createdAt).getFullYear()}</div>
                      <div className="text-xs text-muted-foreground">Member Since</div>
                    </div>
                  </div>
                  <Link href={`/u/${user._id}/followers`} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.followerCount}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                  </Link>
                  <Link href={`/u/${user._id}/following`} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.followingCount}</div>
                      <div className="text-xs text-muted-foreground">Following</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Posts</h2>
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

