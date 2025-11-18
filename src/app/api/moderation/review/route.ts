import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Comment } from '@/lib/models/comment';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const reviewSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(['post', 'comment']),
  action: z.enum(['approve', 'remove', 'warn']),
  reason: z.string().optional(),
});

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const body = await request.json();
    const validated = reviewSchema.parse(body);

    const postsCollection = await getCollection<Post>('posts');
    const commentsCollection = await getCollection<Comment>('comments');

    if (validated.itemType === 'post') {
      const post = await postsCollection.findOne({ _id: new ObjectId(validated.itemId) });
      if (!post) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      if (validated.action === 'remove') {
        await postsCollection.updateOne(
          { _id: post._id },
          {
            $set: {
              status: 'archived',
              moderationStatus: 'removed',
              moderatedBy: new ObjectId(userId),
              moderatedAt: new Date(),
              moderationReason: validated.reason,
            },
          }
        );
      } else if (validated.action === 'approve') {
        await postsCollection.updateOne(
          { _id: post._id },
          {
            $set: {
              moderationStatus: 'approved',
              moderatedBy: new ObjectId(userId),
              moderatedAt: new Date(),
              reportCount: 0,
            },
          }
        );
      }
    } else {
      const comment = await commentsCollection.findOne({ _id: new ObjectId(validated.itemId) });
      if (!comment) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      if (validated.action === 'remove') {
        await commentsCollection.updateOne(
          { _id: comment._id },
          {
            $set: {
              isDeleted: true,
              moderationStatus: 'removed',
              moderatedBy: new ObjectId(userId),
              moderatedAt: new Date(),
              moderationReason: validated.reason,
            },
          }
        );
      } else if (validated.action === 'approve') {
        await commentsCollection.updateOne(
          { _id: comment._id },
          {
            $set: {
              moderationStatus: 'approved',
              moderatedBy: new ObjectId(userId),
              moderatedAt: new Date(),
              reportCount: 0,
            },
          }
        );
      }
    }

    return NextResponse.json({ message: 'Review completed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error reviewing item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireRole(['admin', 'moderator'])(handler);
