import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Tournament } from '@/lib/models/tournament';
import { z } from 'zod';

const createTournamentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  topic: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  registrationDeadline: z.string().datetime(),
  maxParticipants: z.number().min(4).max(128).default(32),
  entryFee: z.number().min(0).default(0),
  prizePool: z.object({
    first: z.number().min(0),
    second: z.number().min(0),
    third: z.number().min(0),
  }).optional(),
  format: z.enum(['single-elimination', 'double-elimination', 'round-robin']).default('single-elimination'),
  allowAI: z.boolean().default(false),
  premiumOnly: z.boolean().default(false),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTournamentSchema.parse(body);
    const userId = (request as any).user.userId;

    const tournamentsCollection = await getCollection<Tournament>('tournaments');
    const tournament: Omit<Tournament, '_id'> = {
      name: validated.name,
      description: validated.description,
      topic: validated.topic,
      organizerId: userId as any,
      status: 'upcoming',
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      registrationDeadline: new Date(validated.registrationDeadline),
      settings: {
        maxParticipants: validated.maxParticipants,
        entryFee: validated.entryFee,
        prizePool: validated.prizePool || {
          first: 0,
          second: 0,
          third: 0,
        },
        format: validated.format,
        allowAI: validated.allowAI,
        premiumOnly: validated.premiumOnly,
      },
      participants: [],
      brackets: [],
      leaderboard: [],
      rewards: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await tournamentsCollection.insertOne(tournament as Tournament);

    return NextResponse.json({
      tournamentId: result.insertedId.toString(),
      tournament: {
        ...tournament,
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

    console.error('Create tournament error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

