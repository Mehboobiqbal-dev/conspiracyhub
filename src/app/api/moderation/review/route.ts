import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { ModerationLog } from '@/lib/models/analytics';
import { z } from 'zod';

const reviewSchema = z.object({
  logId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'ban']),
  reason: z.string().optional(),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = reviewSchema.parse(body);
    const moderatorId = (request as any).user.userId;

    const moderationCollection = await getCollection<ModerationLog>('moderation_logs');
    const log = await moderationCollection.findOne({ _id: validated.logId as any });

    if (!log) {
      return NextResponse.json(
        { error: 'Moderation log not found' },
        { status: 404 }
      );
    }

    if (log.resolved) {
      return NextResponse.json(
        { error: 'Already resolved' },
        { status: 400 }
      );
    }

    await moderationCollection.updateOne(
      { _id: log._id },
      {
        $set: {
          action: validated.action,
          reason: validated.reason,
          moderatorId: moderatorId as any,
          resolved: true,
          resolvedAt: new Date(),
        },
      }
    );

    // If banned, update user status
    if (validated.action === 'ban' && log.userId) {
      const usersCollection = await getCollection('users');
      await usersCollection.updateOne(
        { _id: log.userId },
        { $set: { isActive: false } }
      );
    }

    return NextResponse.json({
      message: 'Review completed',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Review moderation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireRole(['moderator', 'admin'])(handler);

