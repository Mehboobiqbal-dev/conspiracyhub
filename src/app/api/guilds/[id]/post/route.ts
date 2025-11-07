import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Guild } from '@/lib/models/guild';
import { z } from 'zod';

const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
});

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = postSchema.parse(body);
    const userId = (request as any).user.userId;
    const guildId = params.id;

    const guildsCollection = await getCollection<Guild>('guilds');
    const guild = await guildsCollection.findOne({ _id: guildId as any });

    if (!guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      );
    }

    // Check if user is a member
    const member = guild.members.find(m => m.userId.toString() === userId && m.status === 'active');
    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this guild' },
        { status: 403 }
      );
    }

    // Create post (in a real implementation, posts would be in a separate collection)
    const postId = new (await import('mongodb')).ObjectId();
    const post = {
      postId,
      title: validated.title,
      content: validated.content,
      authorId: userId as any,
      createdAt: new Date(),
      replies: 0,
      views: 0,
      pinned: false,
      locked: false,
    };

    await guildsCollection.updateOne(
      { _id: guild._id },
      {
        $push: { forums: post },
        $inc: { 'stats.totalPosts': 1 },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: 'Post created successfully',
      postId: postId.toString(),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

