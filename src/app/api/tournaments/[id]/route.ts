import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Tournament } from '@/lib/models/tournament';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentId = params.id;
    const tournamentsCollection = await getCollection<Tournament>('tournaments');
    const tournament = await tournamentsCollection.findOne({ _id: tournamentId as any });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tournament: {
        ...tournament,
        _id: tournament._id?.toString(),
      },
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

