import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Arena } from '@/lib/models/arena';
import { moderateRealTimeDebates } from '@/ai/flows/moderate-real-time-debates';
import { z } from 'zod';

const argumentSchema = z.object({
  content: z.string().min(1).max(2000),
});

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = argumentSchema.parse(body);
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

    if (arena.status !== 'active') {
      return NextResponse.json(
        { error: 'Arena is not active' },
        { status: 400 }
      );
    }

    const isParticipant = arena.participants.some(
      p => p.userId.toString() === userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Not a participant in this arena' },
        { status: 403 }
      );
    }

    // Moderate content if enabled
    let fallacies: Array<{ type: string; detectedAt: Date }> = [];
    if (arena.settings.moderationEnabled) {
      const moderationResult = await moderateRealTimeDebates({
        content: validated.content,
        context: arena.topic,
      });

      if (moderationResult.toxic) {
        return NextResponse.json(
          { error: 'Content violates community guidelines', details: moderationResult.reason },
          { status: 400 }
        );
      }

      if (moderationResult.fallacies) {
        fallacies = moderationResult.fallacies.map(f => ({
          type: f,
          detectedAt: new Date(),
        }));
      }
    }

    // Add argument to current round
    const currentRound = arena.rounds[arena.currentRound - 1];
    if (!currentRound) {
      return NextResponse.json(
        { error: 'No active round' },
        { status: 400 }
      );
    }

    await arenasCollection.updateOne(
      { _id: arena._id },
      {
        $push: {
          [`rounds.${arena.currentRound - 1}.arguments`]: {
            userId: userId as any,
            content: validated.content,
            timestamp: new Date(),
            reactions: [],
            votes: 0,
            fallacies,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: 'Argument submitted successfully',
      fallacies: fallacies.length > 0 ? fallacies.map(f => f.type) : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Submit argument error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

