import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft, DraftMedia } from '@/lib/models/draft';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const mediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  caption: z.string().optional(),
  altText: z.string().optional(),
  thumbnail: z.string().optional(),
});

const autosaveSchema = z.object({
  draftId: z.string().optional(),
  title: z.string().optional(),
  content: z.string().min(1),
  type: z.enum(['conspiracy', 'opinion']).optional(),
  topicSlug: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  media: z.array(mediaSchema).optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  scheduledFor: z.string().datetime().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

function getWordCount(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').length;
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = autosaveSchema.parse(body);
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const draftsCollection = await getCollection<Draft>('drafts');
    const now = new Date();
    const authorObjectId = new ObjectId(userId);

    const updatePayload: Partial<Draft> = {
      title: validated.title ?? '',
      content: validated.content,
      type: validated.type || 'conspiracy',
      topicSlug: validated.topicSlug || undefined,
      tags: validated.tags || [],
      excerpt: validated.excerpt,
      featuredImage: validated.featuredImage,
      media: (validated.media as DraftMedia[]) || [],
      status: validated.status || 'draft',
      scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : undefined,
      autosavedAt: now,
      updatedAt: now,
      wordCount: getWordCount(validated.content),
      visibility: validated.visibility || 'public',
    };

    const { draftId } = validated;
    if (draftId) {
      const draftObjectId = new ObjectId(draftId);
      await draftsCollection.updateOne(
        { _id: draftObjectId, authorId: authorObjectId },
        { $set: updatePayload, $setOnInsert: { createdAt: now, authorId: authorObjectId } },
        { upsert: true }
      );
      return NextResponse.json({ draftId });
    }

    const result = await draftsCollection.insertOne({
      ...updatePayload,
      authorId: authorObjectId,
      createdAt: now,
    } as Draft);

    return NextResponse.json({ draftId: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Autosave draft error:', error);
    return NextResponse.json(
      { error: 'Failed to autosave draft' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);


