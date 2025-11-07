import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { EchoSimulation } from '@/lib/models/opinion';
import { z } from 'zod';

const completeSchema = z.object({
  simulationId: z.string().min(1),
  rating: z.number().min(1).max(5).optional(),
  memeReportUrl: z.string().url().optional(),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = completeSchema.parse(body);
    const userId = (request as any).user.userId;

    const simulationsCollection = await getCollection<EchoSimulation>('echo_simulations');
    const simulation = await simulationsCollection.findOne({
      _id: validated.simulationId as any,
      userId: userId as any,
    });

    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    await simulationsCollection.updateOne(
      { _id: simulation._id },
      {
        $set: {
          rating: validated.rating,
          memeReport: validated.memeReportUrl ? {
            url: validated.memeReportUrl,
            generatedAt: new Date(),
          } : undefined,
          completedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: 'Simulation completed',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Complete simulation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

