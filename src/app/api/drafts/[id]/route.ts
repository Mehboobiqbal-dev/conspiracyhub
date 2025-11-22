import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft, DraftMedia } from '@/lib/models/draft';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const mediaSchema = z.object({
  url: z.string().refine(
    (val) => {
      if (!val || val.trim() === '') return true; // Allow empty
      // Allow absolute URLs or relative paths starting with /
      try {
        new URL(val);
        return true; // Valid absolute URL
      } catch {
        return val.startsWith('/'); // Valid relative path
      }
    },
    { message: 'URL must be a valid absolute URL or relative path starting with /' }
  ),
  type: z.enum(['image', 'video']),
  caption: z.string().optional().nullable(),
  altText: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
});

const updateDraftSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['conspiracy', 'opinion']).optional(),
  topicSlug: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  media: z.array(mediaSchema).optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  visibility: z.enum(['public', 'private']).optional(),
});

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
      return NextResponse.json({
        draft: {
          ...draft,
          _id: draft._id?.toString(),
          authorId: draft.authorId?.toString(),
        },
      });
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const validated = updateDraftSchema.parse(body);

      const update: Partial<Draft> = {
        updatedAt: new Date(),
      };

      if (validated.title !== undefined) update.title = validated.title;
      if (validated.content !== undefined) {
        update.content = validated.content;
        update.wordCount = validated.content
          .replace(/<[^>]+>/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;
      }
      if (validated.type !== undefined) update.type = validated.type;
      if (validated.topicSlug !== undefined) update.topicSlug = validated.topicSlug || undefined;
      if (validated.tags !== undefined) update.tags = validated.tags;
      if (validated.excerpt !== undefined) update.excerpt = validated.excerpt;
      if (validated.featuredImage !== undefined) update.featuredImage = validated.featuredImage;
      if (validated.media !== undefined) {
        // Filter out media items with empty URLs
        const validMedia = validated.media.filter((m) => m.url && m.url.trim() !== '');
        update.media = validMedia as DraftMedia[];
      }
      if (validated.status !== undefined) update.status = validated.status;
      if (validated.scheduledFor !== undefined) {
        update.scheduledFor = validated.scheduledFor ? new Date(validated.scheduledFor) : undefined;
      }
      if (validated.visibility !== undefined) update.visibility = validated.visibility;

      await draftsCollection.updateOne(
        { _id: draftId },
        { $set: update }
      );

      const updated = await draftsCollection.findOne({ _id: draftId });
      return NextResponse.json({
        draft: {
          ...updated,
          _id: updated?._id?.toString(),
          authorId: updated?.authorId?.toString(),
        },
      });
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

