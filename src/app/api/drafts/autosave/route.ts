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

const autosaveSchema = z.object({
  draftId: z.string().optional(),
  title: z.string().optional(),
  content: z.string(), // Remove min(1) - allow empty for drafts
  type: z.enum(['conspiracy', 'opinion']).optional(),
  topicSlug: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  media: z.array(mediaSchema).optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
  visibility: z.enum(['public', 'private']).optional(),
});

function getWordCount(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').length;
}

async function handler(request: NextRequest) {
  try {
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    let validated;
    try {
      validated = autosaveSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Autosave validation error:', {
          errors: validationError.errors,
          body: {
            ...body,
            content: body.content ? `${body.content.substring(0, 100)}...` : 'empty',
          },
        });
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            details: validationError.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code,
            }))
          },
          { status: 400 }
        );
      }
      throw validationError;
    }
    const draftsCollection = await getCollection<Draft>('drafts');
    const now = new Date();
    const authorObjectId = new ObjectId(userId);

    // Filter out media items with empty URLs
    const validMedia = validated.media?.filter((m) => m.url && m.url.trim() !== '') || [];

    const updatePayload: Partial<Draft> = {
      title: validated.title ?? '',
      content: validated.content || '<p></p>', // Default to empty paragraph if content is empty
      type: validated.type || 'conspiracy',
      topicSlug: validated.topicSlug || undefined,
      tags: validated.tags || [],
      excerpt: validated.excerpt || undefined,
      featuredImage: validated.featuredImage || undefined,
      media: validMedia as DraftMedia[],
      status: validated.status || 'draft',
      scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : undefined,
      autosavedAt: now,
      updatedAt: now,
      wordCount: getWordCount(validated.content || ''),
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


