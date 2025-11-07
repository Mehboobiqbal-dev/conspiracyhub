import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { ModerationLog } from '@/lib/models/analytics';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const moderationCollection = await getCollection<ModerationLog>('moderation_logs');
    const query: any = { resolved: false };

    if (severity) {
      query.severity = severity;
    }

    const logs = await moderationCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return NextResponse.json({
      logs: logs.map(l => ({
        ...l,
        _id: l._id?.toString(),
      })),
      total: await moderationCollection.countDocuments(query),
    });
  } catch (error) {
    console.error('Get moderation queue error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireRole(['moderator', 'admin'])(handler);

