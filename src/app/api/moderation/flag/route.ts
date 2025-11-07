import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { ModerationLog } from '@/lib/models/analytics';
import { assistWithContentModeration } from '@/ai/flows/assist-with-content-moderation';
import { z } from 'zod';

const flagSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['opinion', 'arena', 'guild_post', 'comment']),
  reason: z.string().min(1).max(500),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = flagSchema.parse(body);
    const userId = (request as any).user.userId;

    // AI-assisted moderation
    const moderationResult = await assistWithContentModeration({
      contentId: validated.contentId,
      contentType: validated.contentType,
      reason: validated.reason,
    });

    const moderationCollection = await getCollection<ModerationLog>('moderation_logs');
    const log: Omit<ModerationLog, '_id'> = {
      contentId: validated.contentId,
      contentType: validated.contentType,
      userId: userId as any,
      action: 'flag',
      reason: validated.reason,
      severity: moderationResult.severity || 'medium',
      aiConfidence: moderationResult.confidence,
      resolved: false,
      createdAt: new Date(),
    };

    await moderationCollection.insertOne(log as ModerationLog);

    return NextResponse.json({
      message: 'Content flagged successfully',
      severity: log.severity,
      requiresReview: moderationResult.requiresReview,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Flag content error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

