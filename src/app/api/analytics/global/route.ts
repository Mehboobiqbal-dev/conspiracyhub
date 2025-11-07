import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { GlobalAnalytics } from '@/lib/models/analytics';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    // Get global analytics
    const usersCollection = await getCollection('users');
    const opinionsCollection = await getCollection('opinions');
    const arenasCollection = await getCollection('arenas');
    const tournamentsCollection = await getCollection('tournaments');

    const [totalUsers, activeUsers, newRegistrations, totalOpinions, totalArenas, totalTournaments] = await Promise.all([
      usersCollection.countDocuments({}),
      usersCollection.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      usersCollection.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      opinionsCollection.countDocuments({}),
      arenasCollection.countDocuments({}),
      tournamentsCollection.countDocuments({}),
    ]);

    // Get trending topics (simplified)
    const trendingTopics = await opinionsCollection.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    const analytics = {
      totalUsers,
      activeUsers,
      newRegistrations,
      totalOpinions,
      totalArenas,
      totalTournaments,
      trendingTopics: trendingTopics.map((t: any) => ({
        topic: t._id || 'Uncategorized',
        engagement: t.count,
        sentiment: 'neutral' as const,
      })),
    };

    return NextResponse.json({
      analytics,
      period,
    });
  } catch (error) {
    console.error('Get global analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireRole(['admin', 'moderator'])(handler);

