import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft, DraftMedia } from '@/lib/models/draft';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const createDraftSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  type: z.enum(['conspiracy', 'opinion']).optional(),
  topicSlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  media: z.array(
    z.object({
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
    })
  ).optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  scheduledFor: z.string().datetime().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

async function handler(request: NextRequest) {
  try {
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const validated = createDraftSchema.parse(body);

    const draftsCollection = await getCollection<Draft>('drafts');
    const authorObjectId = new ObjectId(userId);
    const now = new Date();
    
    const draft: Omit<Draft, '_id'> = {
      authorId: authorObjectId,
      title: validated.title || '',
      content: validated.content,
      type: validated.type || 'conspiracy',
      topicSlug: validated.topicSlug || undefined,
      tags: validated.tags || [],
      excerpt: validated.excerpt,
      featuredImage: validated.featuredImage,
      media: (validated.media?.filter((m) => m.url && m.url.trim() !== '') as DraftMedia[]) || [],
      createdAt: now,
      updatedAt: now,
      autosavedAt: now,
      status: validated.status || 'draft',
      scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : undefined,
      wordCount: validated.content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
      visibility: validated.visibility || 'public',
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

