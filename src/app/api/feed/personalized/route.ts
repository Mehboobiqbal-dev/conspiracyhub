import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { UserStats } from '@/lib/models/user-activity';
import { UserFollow } from '@/lib/models/user-follow';
import { ObjectId } from 'mongodb';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const statsCollection = await getCollection<UserStats>('user_stats');
    const followsCollection = await getCollection<UserFollow>('user_follows');
    const postsCollection = await getCollection<Post>('posts');

    // Get user's followed topics
    const userStats = await statsCollection.findOne({ userId: new ObjectId(userId) });
    const followedTopics = userStats?.followedTopics || [];

    // Get user's followed accounts
    const followedUsers = await followsCollection
      .find({ followerId: new ObjectId(userId) })
      .toArray();
    const followedUserIds = followedUsers.map(f => f.followingId);

    // Build query: posts from followed topics OR followed users
    const query: any = {
      status: 'published',
      $or: [
        ...(followedTopics.length > 0 ? [{ topicId: { $in: followedTopics } }] : []),
        ...(followedUserIds.length > 0 ? [{ authorId: { $in: followedUserIds } }] : []),
      ],
    };

    // If no follows, return empty or trending posts
    if (followedTopics.length === 0 && followedUserIds.length === 0) {
      const trendingPosts = await postsCollection
        .find({ status: 'published' })
        .sort({ upvotes: -1, createdAt: -1 })
        .limit(limit)
        .toArray();

      return NextResponse.json({
        posts: trendingPosts.map(post => ({
          ...post,
          _id: post._id?.toString(),
          topicId: post.topicId?.toString(),
          authorId: post.authorId?.toString(),
        })),
        source: 'trending',
      });
    }

    const posts = await postsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
      source: 'personalized',
    });
  } catch (error) {
    console.error('Error fetching personalized feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);


