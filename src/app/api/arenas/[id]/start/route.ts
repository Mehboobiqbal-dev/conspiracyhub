import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Arena } from '@/lib/models/arena';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (request as any).user.userId;
    const arenaId = params.id;

    const arenasCollection = await getCollection<Arena>('arenas');
    const arena = await arenasCollection.findOne({ _id: arenaId as any });

    if (!arena) {
      return NextResponse.json(
        { error: 'Arena not found' },
        { status: 404 }
      );
    }

    if (arena.creatorId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Only the creator can start the arena' },
        { status: 403 }
      );
    }

    if (arena.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Arena cannot be started in current state' },
        { status: 400 }
      );
    }

    if (arena.participants.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 participants to start' },
        { status: 400 }
      );
    }

    // Initialize first round
    await arenasCollection.updateOne(
      { _id: arena._id },
      {
        $set: {
          status: 'active',
          currentRound: 1,
          startedAt: new Date(),
          updatedAt: new Date(),
        },
        $push: {
          rounds: {
            roundNumber: 1,
            startedAt: new Date(),
            arguments: [],
          },
        },
      }
    );

    return NextResponse.json({
      message: 'Arena started successfully',
    });
  } catch (error) {
    console.error('Start arena error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

