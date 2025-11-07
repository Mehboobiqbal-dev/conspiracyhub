import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { TimeCapsule } from '@/lib/models/time-capsule';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const capsulesCollection = await getCollection<TimeCapsule>('time_capsules');
    const query: any = {
      $or: [
        { userId: userId as any },
        { 'collaborators.userId': userId as any },
      ],
    };

    if (status) {
      query.status = status;
    }

    const capsules = await capsulesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    return NextResponse.json({
      capsules: capsules.map(c => ({
        ...c,
        _id: c._id?.toString(),
        // Don't reveal content if still sealed
        content: c.status === 'opened' ? c.content : undefined,
        actualViews: c.status === 'opened' ? c.actualViews : undefined,
      })),
      total: await capsulesCollection.countDocuments(query),
    });
  } catch (error) {
    console.error('Get time capsules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);

