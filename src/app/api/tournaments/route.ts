import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Tournament } from '@/lib/models/tournament';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'upcoming';
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const tournamentsCollection = await getCollection<Tournament>('tournaments');
    const tournaments = await tournamentsCollection
      .find({ status })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return NextResponse.json({
      tournaments: tournaments.map(t => ({
        ...t,
        _id: t._id?.toString(),
      })),
      total: await tournamentsCollection.countDocuments({ status }),
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

