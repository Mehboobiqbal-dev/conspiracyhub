import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Arena } from '@/lib/models/arena';
import { z } from 'zod';

const createArenaSchema = z.object({
  title: z.string().min(1).max(200),
  topic: z.string().min(1),
  maxParticipants: z.number().min(2).max(10).default(4),
  roundDuration: z.number().min(30).max(600).default(300),
  maxRounds: z.number().min(1).max(10).default(5),
  allowVoice: z.boolean().default(false),
  public: z.boolean().default(true),
  moderationEnabled: z.boolean().default(true),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createArenaSchema.parse(body);
    const userId = (request as any).user.userId;

    // Get user info
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ _id: userId as any });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const arenasCollection = await getCollection<Arena>('arenas');
    const arena: Omit<Arena, '_id'> = {
      title: validated.title,
      topic: validated.topic,
      creatorId: userId as any,
      participants: [{
        userId: userId as any,
        name: user.name,
        avatar: user.avatar,
        joinedAt: new Date(),
        isAI: false,
      }],
      status: 'waiting',
      settings: {
        maxParticipants: validated.maxParticipants,
        roundDuration: validated.roundDuration,
        maxRounds: validated.maxRounds,
        allowVoice: validated.allowVoice,
        public: validated.public,
        moderationEnabled: validated.moderationEnabled,
      },
      rounds: [],
      currentRound: 0,
      scores: [{
        userId: userId as any,
        points: 0,
        wins: 0,
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await arenasCollection.insertOne(arena as Arena);

    return NextResponse.json({
      arenaId: result.insertedId.toString(),
      arena: {
        ...arena,
        _id: result.insertedId.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create arena error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

