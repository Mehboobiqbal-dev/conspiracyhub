import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Tournament } from '@/lib/models/tournament';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (request as any).user.userId;
    const tournamentId = params.id;

    const tournamentsCollection = await getCollection<Tournament>('tournaments');
    const tournament = await tournamentsCollection.findOne({ _id: tournamentId as any });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'registration') {
      return NextResponse.json(
        { error: 'Tournament registration is closed' },
        { status: 400 }
      );
    }

    if (new Date() > tournament.registrationDeadline) {
      return NextResponse.json(
        { error: 'Registration deadline has passed' },
        { status: 400 }
      );
    }

    if (tournament.participants.length >= tournament.settings.maxParticipants) {
      return NextResponse.json(
        { error: 'Tournament is full' },
        { status: 400 }
      );
    }

    if (tournament.participants.some(p => p.userId.toString() === userId)) {
      return NextResponse.json(
        { error: 'Already registered' },
        { status: 400 }
      );
    }

    // Get user info
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ _id: userId as any });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (tournament.settings.premiumOnly && user.subscriptionTier === 'free') {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      );
    }

    await tournamentsCollection.updateOne(
      { _id: tournament._id },
      {
        $push: {
          participants: {
            userId: userId as any,
            name: user.name,
            avatar: user.avatar,
            registeredAt: new Date(),
            isPremium: user.subscriptionTier !== 'free',
            status: 'registered',
          },
        },
        $set: { 
          updatedAt: new Date(),
          status: 'registration',
        },
      }
    );

    return NextResponse.json({
      message: 'Registered successfully',
    });
  } catch (error) {
    console.error('Register tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

