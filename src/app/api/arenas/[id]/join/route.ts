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

    if (arena.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Arena is not accepting new participants' },
        { status: 400 }
      );
    }

    if (arena.participants.length >= arena.settings.maxParticipants) {
      return NextResponse.json(
        { error: 'Arena is full' },
        { status: 400 }
      );
    }

    if (arena.participants.some(p => p.userId.toString() === userId)) {
      return NextResponse.json(
        { error: 'Already a participant' },
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

    await arenasCollection.updateOne(
      { _id: arena._id },
      {
        $push: {
          participants: {
            userId: userId as any,
            name: user.name,
            avatar: user.avatar,
            joinedAt: new Date(),
            isAI: false,
          },
          scores: {
            userId: userId as any,
            points: 0,
            wins: 0,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: 'Joined arena successfully',
    });
  } catch (error) {
    console.error('Join arena error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

