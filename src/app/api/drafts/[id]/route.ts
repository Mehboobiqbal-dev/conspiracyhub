import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft } from '@/lib/models/draft';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const updateDraftSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['conspiracy', 'opinion']).optional(),
  topicSlug: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = (request as any).user.userId;
    const draftId = new ObjectId(id);

    const draftsCollection = await getCollection<Draft>('drafts');
    const draft = await draftsCollection.findOne({ _id: draftId });

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    if (draft.authorId?.toString() !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (request.method === 'GET') {
      return NextResponse.json({ draft });
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const validated = updateDraftSchema.parse(body);

      const update: Partial<Draft> = {
        updatedAt: new Date(),
      };

      if (validated.title !== undefined) update.title = validated.title;
      if (validated.content !== undefined) update.content = validated.content;
      if (validated.type !== undefined) update.type = validated.type;
      if (validated.topicSlug !== undefined) update.topicSlug = validated.topicSlug || undefined;
      if (validated.tags !== undefined) update.tags = validated.tags;

      await draftsCollection.updateOne(
        { _id: draftId },
        { $set: update }
      );

      const updated = await draftsCollection.findOne({ _id: draftId });
      return NextResponse.json({ draft: updated });
    }

    if (request.method === 'DELETE') {
      await draftsCollection.deleteOne({ _id: draftId });
      return NextResponse.json({ message: 'Draft deleted' });
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error handling draft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);
export const PUT = requireAuth(handler);
export const DELETE = requireAuth(handler);

