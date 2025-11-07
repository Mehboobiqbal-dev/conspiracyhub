import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { UserAnalytics } from '@/lib/models/analytics';
import { z } from 'zod';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    // Get user analytics
    const analyticsCollection = await getCollection<UserAnalytics>('user_analytics');
    
    // Get all collections for counting
    const opinionsCollection = await getCollection('opinions');
    const arenasCollection = await getCollection('arenas');
    const tournamentsCollection = await getCollection('tournaments');
    const guildsCollection = await getCollection('guilds');
    const capsulesCollection = await getCollection('time_capsules');

    const [opinions, arenas, tournaments, guilds, capsules] = await Promise.all([
      opinionsCollection.countDocuments({ userId: userId as any }),
      arenasCollection.countDocuments({ 
        $or: [
          { creatorId: userId as any },
          { 'participants.userId': userId as any },
        ],
      }),
      tournamentsCollection.countDocuments({
        $or: [
          { organizerId: userId as any },
          { 'participants.userId': userId as any },
        ],
      }),
      guildsCollection.countDocuments({ 'members.userId': userId as any }),
      capsulesCollection.countDocuments({ userId: userId as any }),
    ]);

    const analytics = {
      opinionsCreated: opinions,
      arenasParticipated: arenas,
      tournamentsJoined: tournaments,
      guildsJoined: guilds,
      timeCapsulesCreated: capsules,
      totalEngagement: opinions + arenas + tournaments + guilds + capsules,
    };

    return NextResponse.json({
      analytics,
      period,
    });
  } catch (error) {
    console.error('Get personal analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);

