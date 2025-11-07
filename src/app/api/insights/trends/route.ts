import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { z } from 'zod';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const timeRange = searchParams.get('timeRange') || '30d';

    const opinionsCollection = await getCollection('opinions');
    const arenasCollection = await getCollection('arenas');
    const tournamentsCollection = await getCollection('tournaments');

    // Calculate date range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get trending topics
    const trendingTopics = await opinionsCollection.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          ...(category ? { category } : {}),
        } 
      },
      { $group: { _id: '$topic', count: { $sum: 1 }, avgSentiment: { $avg: '$bias.score' } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray();

    // Get bias trends
    const biasTrends = await opinionsCollection.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          'bias.detected': true,
        } 
      },
      { 
        $group: { 
          _id: '$bias.type', 
          averageScore: { $avg: '$bias.score' },
          count: { $sum: 1 },
        } 
      },
      { $sort: { count: -1 } },
    ]).toArray();

    // Get engagement metrics
    const engagementMetrics = {
      totalOpinions: await opinionsCollection.countDocuments({ createdAt: { $gte: startDate } }),
      totalArenas: await arenasCollection.countDocuments({ createdAt: { $gte: startDate } }),
      totalTournaments: await tournamentsCollection.countDocuments({ createdAt: { $gte: startDate } }),
    };

    return NextResponse.json({
      trends: {
        trendingTopics: trendingTopics.map((t: any) => ({
          topic: t._id || 'Uncategorized',
          engagement: t.count,
          sentiment: t.avgSentiment > 0.5 ? 'positive' : t.avgSentiment < -0.5 ? 'negative' : 'neutral',
        })),
        biasTrends: biasTrends.map((b: any) => ({
          category: b._id || 'Unknown',
          averageScore: b.averageScore || 0,
          distribution: { count: b.count },
        })),
        engagement: engagementMetrics,
        timeRange,
      },
    });
  } catch (error) {
    console.error('Get insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);

