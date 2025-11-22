import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { UserStats } from '@/lib/models/user-activity';
import { UserFollow } from '@/lib/models/user-follow';
import { publishDueScheduledPosts } from '@/lib/utils/scheduled-posts';
import { ObjectId } from 'mongodb';

async function handler(request: NextRequest) {
  try {
    await publishDueScheduledPosts();

    const userId = (request as any).user.userId;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const sort = searchParams.get('sort') || 'newest';
    const type = searchParams.get('type') as 'conspiracy' | 'opinion' | null;

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
    };

    if (type) {
      query.type = type;
    }

    // If no follows, return trending posts
    if (followedTopics.length === 0 && followedUserIds.length === 0) {
      let sortQuery: any = { createdAt: -1 };
      const now = new Date();
      
      switch (sort) {
        case 'hot':
        case 'trending':
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          query.createdAt = { $gte: sevenDaysAgo };
          sortQuery = { upvotes: -1, commentCount: -1, createdAt: -1 };
          break;
        case 'popular':
        case 'top':
          sortQuery = { upvotes: -1, createdAt: -1 };
          break;
        default:
          sortQuery = { createdAt: -1 };
      }

      const skip = (page - 1) * limit;
      const trendingPosts = await postsCollection
        .find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await postsCollection.countDocuments(query);

      return NextResponse.json({
        posts: trendingPosts.map(post => ({
          ...post,
          _id: post._id?.toString(),
          topicId: post.topicId?.toString(),
          authorId: post.authorId?.toString(),
        })),
        source: 'trending',
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Build personalized query
    query.$or = [
      ...(followedTopics.length > 0 ? [{ topicId: { $in: followedTopics } }] : []),
      ...(followedUserIds.length > 0 ? [{ authorId: { $in: followedUserIds } }] : []),
    ];

    // Apply sorting
    let sortQuery: any = { createdAt: -1 };
    const now = new Date();
    
    switch (sort) {
      case 'hot':
      case 'trending':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { ...query.createdAt, $gte: sevenDaysAgo };
        sortQuery = { upvotes: -1, commentCount: -1, createdAt: -1 };
        break;
      case 'popular':
      case 'top':
        sortQuery = { upvotes: -1, createdAt: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;
    const posts = await postsCollection
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await postsCollection.countDocuments(query);

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
      source: 'personalized',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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


