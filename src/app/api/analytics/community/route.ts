import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Comment } from '@/lib/models/comment';
import { Topic } from '@/lib/models/topic';
import { UserStats } from '@/lib/models/user-activity';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const postsCollection = await getCollection<Post>('posts');
    const commentsCollection = await getCollection<Comment>('comments');
    const topicsCollection = await getCollection<Topic>('topics');
    const statsCollection = await getCollection<UserStats>('user_stats');

    // Total counts
    const totalPosts = await postsCollection.countDocuments({ status: 'published' });
    const totalComments = await commentsCollection.countDocuments({ isDeleted: false });
    const totalTopics = await topicsCollection.countDocuments({});
    const totalUsers = await statsCollection.countDocuments({});

    // Recent activity
    const recentPosts = await postsCollection.countDocuments({
      status: 'published',
      createdAt: { $gte: startDate },
    });

    const recentComments = await commentsCollection.countDocuments({
      isDeleted: false,
      createdAt: { $gte: startDate },
    });

    // AI vs Human split
    const aiPosts = await postsCollection.countDocuments({
      status: 'published',
      isAIGenerated: true,
      createdAt: { $gte: startDate },
    });

    const humanPosts = await postsCollection.countDocuments({
      status: 'published',
      isAIGenerated: false,
      createdAt: { $gte: startDate },
    });

    // Top topics
    const topTopics = await topicsCollection
      .find({})
      .sort({ postCount: -1 })
      .limit(10)
      .toArray();

    // Growth metrics
    const postsByDay = await postsCollection.aggregate([
      {
        $match: {
          status: 'published',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    return NextResponse.json({
      totals: {
        posts: totalPosts,
        comments: totalComments,
        topics: totalTopics,
        users: totalUsers,
      },
      recent: {
        posts: recentPosts,
        comments: recentComments,
        period: `${days} days`,
      },
      aiVsHuman: {
        ai: aiPosts,
        human: humanPosts,
        aiPercentage: recentPosts > 0 ? ((aiPosts / recentPosts) * 100).toFixed(1) : '0',
      },
      topTopics: topTopics.map(topic => ({
        _id: topic._id?.toString(),
        name: topic.name,
        slug: topic.slug,
        postCount: topic.postCount,
        followerCount: topic.followerCount,
      })),
      growth: {
        postsByDay: postsByDay.map(item => ({
          date: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireRole(['admin', 'moderator'])(handler);

