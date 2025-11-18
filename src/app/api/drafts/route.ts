import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft } from '@/lib/models/draft';
import { z } from 'zod';

const createDraftSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  type: z.enum(['conspiracy', 'opinion']).optional(),
  topicSlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const body = await request.json();
    const validated = createDraftSchema.parse(body);

    const draftsCollection = await getCollection<Draft>('drafts');
    
    const draft: Omit<Draft, '_id'> = {
      authorId: userId as any,
      title: validated.title || '',
      content: validated.content,
      type: validated.type || 'conspiracy',
      topicSlug: validated.topicSlug,
      tags: validated.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await draftsCollection.insertOne(draft as Draft);

    return NextResponse.json({
      draft: {
        ...draft,
        _id: result.insertedId.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating draft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

