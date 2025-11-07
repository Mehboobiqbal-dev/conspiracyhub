import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { TimeCapsule } from '@/lib/models/time-capsule';
import { generatePredictiveSimulationsForTimeCapsules } from '@/ai/flows/generate-predictive-simulations-for-time-capsules';
import { z } from 'zod';

const createCapsuleSchema = z.object({
  content: z.string().min(1).max(5000),
  topic: z.string().min(1),
  unlockDate: z.string().datetime(),
  collaborators: z.array(z.string()).optional(),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createCapsuleSchema.parse(body);
    const userId = (request as any).user.userId;

    const unlockDate = new Date(validated.unlockDate);
    if (unlockDate <= new Date()) {
      return NextResponse.json(
        { error: 'Unlock date must be in the future' },
        { status: 400 }
      );
    }

    // Generate AI prediction
    const aiPrediction = await generatePredictiveSimulationsForTimeCapsules({
      content: validated.content,
      topic: validated.topic,
    });

    const capsulesCollection = await getCollection<TimeCapsule>('time_capsules');
    const capsule: Omit<TimeCapsule, '_id'> = {
      userId: userId as any,
      content: validated.content,
      topic: validated.topic,
      collaborators: validated.collaborators?.map(collabId => ({
        userId: collabId as any,
        addedAt: new Date(),
      })) || [],
      unlockDate,
      sealedAt: new Date(),
      status: 'sealed',
      aiPrediction: {
        predictedViews: aiPrediction.predictedViews || [],
        confidence: aiPrediction.confidence || 0.7,
        generatedAt: new Date(),
      },
      reminders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await capsulesCollection.insertOne(capsule as TimeCapsule);

    // TODO: Store on blockchain (Solana)
    // const blockchainHash = await storeOnBlockchain(capsule);

    return NextResponse.json({
      capsuleId: result.insertedId.toString(),
      capsule: {
        ...capsule,
        _id: result.insertedId.toString(),
        aiPrediction: capsule.aiPrediction,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create time capsule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

