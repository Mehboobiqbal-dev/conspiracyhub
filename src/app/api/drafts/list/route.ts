import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft } from '@/lib/models/draft';
import { ObjectId } from 'mongodb';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const draftsCollection = await getCollection<Draft>('drafts');

    const drafts = await draftsCollection
      .find({ authorId: new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      drafts: drafts.map(draft => ({
        ...draft,
        _id: draft._id?.toString(),
        authorId: draft.authorId?.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);

