import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Opinion } from '@/lib/models/opinion';
import { z } from 'zod';

const createOpinionSchema = z.object({
  content: z.string().min(1).max(5000),
  topic: z.string().optional(),
  category: z.string().default('general'),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
});

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;

    if (request.method === 'POST') {
      const body = await request.json();
      const validated = createOpinionSchema.parse(body);

      const opinionsCollection = await getCollection<Opinion>('opinions');
      const opinion: Omit<Opinion, '_id'> = {
        userId: userId as any,
        content: validated.content,
        topic: validated.topic,
        category: validated.category,
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 0,
        dislikes: 0,
        views: 0,
        isPublic: validated.isPublic,
        tags: validated.tags || [],
      };

      const result = await opinionsCollection.insertOne(opinion as Opinion);

      return NextResponse.json({
        opinionId: result.insertedId.toString(),
        opinion: {
          ...opinion,
          _id: result.insertedId.toString(),
        },
      }, { status: 201 });
    } else {
      // GET - list opinions
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const topic = searchParams.get('topic');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = parseInt(searchParams.get('skip') || '0');

      const opinionsCollection = await getCollection<Opinion>('opinions');
      const query: any = { isPublic: true };
      
      if (category) query.category = category;
      if (topic) query.topic = topic;

      const opinions = await opinionsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray();

      return NextResponse.json({
        opinions: opinions.map(o => ({
          ...o,
          _id: o._id?.toString(),
        })),
        total: await opinionsCollection.countDocuments(query),
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Opinions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = requireAuth(handler);

