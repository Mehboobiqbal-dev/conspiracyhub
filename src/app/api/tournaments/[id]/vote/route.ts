import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Tournament } from '@/lib/models/tournament';
import { z } from 'zod';

const voteSchema = z.object({
  matchId: z.string().min(1),
  votedFor: z.string().min(1), // participant userId
});

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = voteSchema.parse(body);
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

    if (tournament.status !== 'active') {
      return NextResponse.json(
        { error: 'Tournament is not active' },
        { status: 400 }
      );
    }

    // Find the match
    let matchFound = false;
    for (const bracket of tournament.brackets) {
      const match = bracket.matches.find(m => m.matchId === validated.matchId);
      if (match) {
        matchFound = true;
        
        // Check if user already voted
        const existingVote = match.votes.find(v => v.userId.toString() === userId);
        if (existingVote) {
          return NextResponse.json(
            { error: 'Already voted on this match' },
            { status: 400 }
          );
        }

        // Check if voted for is a participant
        if (match.participant1Id.toString() !== validated.votedFor && 
            match.participant2Id.toString() !== validated.votedFor) {
          return NextResponse.json(
            { error: 'Invalid participant' },
            { status: 400 }
          );
        }

        // Add vote
        await tournamentsCollection.updateOne(
          { _id: tournament._id, 'brackets.matches.matchId': validated.matchId },
          {
            $push: {
              'brackets.$[bracket].matches.$[match].votes': {
                userId: userId as any,
                votedFor: validated.votedFor as any,
                timestamp: new Date(),
              },
            },
            $set: { updatedAt: new Date() },
          },
          {
            arrayFilters: [
              { 'bracket.matches.matchId': validated.matchId },
              { 'match.matchId': validated.matchId },
            ],
          }
        );

        break;
      }
    }

    if (!matchFound) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

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

    console.error('Tournament vote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

