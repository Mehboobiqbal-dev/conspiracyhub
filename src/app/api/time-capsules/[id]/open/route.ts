import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { TimeCapsule } from '@/lib/models/time-capsule';
import { z } from 'zod';

const openSchema = z.object({
  reflection: z.string().min(1).max(5000).optional(),
});

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const validated = openSchema.parse(body);
    const userId = (request as any).user.userId;
    const capsuleId = params.id;

    const capsulesCollection = await getCollection<TimeCapsule>('time_capsules');
    const capsule = await capsulesCollection.findOne({ _id: capsuleId as any });

    if (!capsule) {
      return NextResponse.json(
        { error: 'Time capsule not found' },
        { status: 404 }
      );
    }

    // Check if user has access
    const hasAccess = capsule.userId.toString() === userId ||
      capsule.collaborators.some(c => c.userId.toString() === userId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (capsule.status === 'opened') {
      return NextResponse.json(
        { error: 'Capsule already opened' },
        { status: 400 }
      );
    }

    if (new Date() < capsule.unlockDate) {
      return NextResponse.json(
        { error: 'Capsule cannot be opened yet' },
        { status: 400 }
      );
    }

    await capsulesCollection.updateOne(
      { _id: capsule._id },
      {
        $set: {
          status: 'opened',
          actualViews: {
            content: capsule.content,
            reflection: validated.reflection || '',
            openedAt: new Date(),
          },
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: 'Time capsule opened successfully',
      capsule: {
        ...capsule,
        status: 'opened',
        actualViews: {
          content: capsule.content,
          reflection: validated.reflection || '',
          openedAt: new Date(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Open time capsule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

