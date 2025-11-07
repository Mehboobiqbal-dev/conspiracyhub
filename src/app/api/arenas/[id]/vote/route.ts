import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Arena } from '@/lib/models/arena';
import { z } from 'zod';

const voteSchema = z.object({
  argumentIndex: z.number().int().min(0),
  roundNumber: z.number().int().min(1),
  vote: z.enum(['up', 'down']),
});

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = voteSchema.parse(body);
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

    const round = arena.rounds[validated.roundNumber - 1];
    if (!round || !round.arguments[validated.argumentIndex]) {
      return NextResponse.json(
        { error: 'Invalid round or argument' },
        { status: 400 }
      );
    }

    const argument = round.arguments[validated.argumentIndex];
    
    // Check if user already voted
    const existingVote = argument.reactions.find(r => r.userId.toString() === userId);
    if (existingVote) {
      return NextResponse.json(
        { error: 'Already voted on this argument' },
        { status: 400 }
      );
    }

    // Update votes
    const voteValue = validated.vote === 'up' ? 1 : -1;
    await arenasCollection.updateOne(
      { _id: arena._id },
      {
        $push: {
          [`rounds.${validated.roundNumber - 1}.arguments.${validated.argumentIndex}.reactions`]: {
            userId: userId as any,
            type: validated.vote === 'up' ? 'like' : 'dislike',
          },
        },
        $inc: {
          [`rounds.${validated.roundNumber - 1}.arguments.${validated.argumentIndex}.votes`]: voteValue,
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: 'Vote recorded',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

