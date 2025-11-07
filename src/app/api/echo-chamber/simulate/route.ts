import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Opinion, EchoSimulation } from '@/lib/models/opinion';
import { z } from 'zod';
import { generateEchoFeedAndBustIt } from '@/ai/flows/generate-echo-feed-and-bust-it';

const simulateSchema = z.object({
  opinion: z.string().min(1).max(280, 'Opinion must be 280 characters or less'),
  topic: z.string().optional(),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = simulateSchema.parse(body);
    const userId = (request as any).user.userId;

    // Save opinion
    const opinionsCollection = await getCollection<Opinion>('opinions');
    const opinion: Omit<Opinion, '_id'> = {
      userId: userId as any,
      content: validated.opinion,
      topic: validated.topic,
      category: 'simulation',
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      dislikes: 0,
      views: 0,
      isPublic: false,
      tags: validated.topic ? [validated.topic] : [],
    };

    const opinionResult = await opinionsCollection.insertOne(opinion as Opinion);
    const opinionId = opinionResult.insertedId;

    // Generate echo feed and bust mode using AI
    const aiResult = await generateEchoFeedAndBustIt({
      opinion: validated.opinion,
      topic: validated.topic,
    });

    // Create simulation
    const simulationsCollection = await getCollection<EchoSimulation>('echo_simulations');
    const simulation: Omit<EchoSimulation, '_id'> = {
      opinionId,
      userId: userId as any,
      echoFeed: aiResult.echoFeed.map((item, index) => ({
        id: `echo-${index}`,
        content: item.content,
        author: item.author,
        timestamp: new Date(),
        absurdity: item.absurdity || 0.5,
      })),
      bustMode: aiResult.bustMode.map((item, index) => ({
        id: `bust-${index}`,
        counterArgument: item.counterArgument,
        source: item.source,
        credibility: item.credibility || 0.8,
      })),
      createdAt: new Date(),
    };

    const simulationResult = await simulationsCollection.insertOne(simulation as EchoSimulation);

    return NextResponse.json({
      simulationId: simulationResult.insertedId.toString(),
      opinionId: opinionId.toString(),
      echoFeed: simulation.echoFeed,
      bustMode: simulation.bustMode,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Echo chamber simulation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

