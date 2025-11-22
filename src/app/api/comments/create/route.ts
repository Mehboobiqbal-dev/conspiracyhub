import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Comment } from '@/lib/models/comment';
import { Post } from '@/lib/models/post';
import { User } from '@/lib/models/user';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { notifyCommentReply, notifyPostReply } from '@/lib/utils/notifications';

const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']).default('image'),
  altText: z.string().optional(),
  caption: z.string().optional(),
  thumbnail: z.string().optional(),
}).optional();

const createCommentSchema = z.object({
  postId: z.string(),
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  attachment: attachmentSchema,
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createCommentSchema.parse(body);
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const commentsCollection = await getCollection<Comment>('comments');
    const postsCollection = await getCollection<Post>('posts');
    const usersCollection = await getCollection<User>('users');

    // Verify post exists
    const postObjectId = new ObjectId(validated.postId);
    const post = await postsCollection.findOne({ _id: postObjectId });
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get user info
    const commenter = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const authorName = commenter?.name || 'Anonymous';
    const authorAvatar = commenter?.avatar;

    // If parentId provided, verify it exists
    if (validated.parentId) {
      const parentObjectId = new ObjectId(validated.parentId);
      const parentComment = await commentsCollection.findOne({ _id: parentObjectId });
      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    const newComment: Omit<Comment, '_id'> = {
      postId: postObjectId,
      authorId: new ObjectId(userId),
      authorName,
      authorAvatar,
      content: validated.content,
      attachment: validated.attachment
        ? {
            url: validated.attachment.url,
            type: validated.attachment.type,
            altText: validated.attachment.altText,
            caption: validated.attachment.caption,
            thumbnail: validated.attachment.thumbnail,
          }
        : undefined,
      parentId: validated.parentId ? new ObjectId(validated.parentId) : undefined,
      upvotes: 0,
      downvotes: 0,
      replyCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
      isDeleted: false,
    };

    const result = await commentsCollection.insertOne(newComment as Comment);

    // Update post comment count
    await postsCollection.updateOne(
      { _id: post._id },
      { $inc: { commentCount: 1 } }
    );

    // Update parent comment reply count if it's a reply
    if (validated.parentId) {
      await commentsCollection.updateOne(
        { _id: validated.parentId as any },
        { $inc: { replyCount: 1 } }
      );
      
      // Notify parent comment author
      const parentComment = await commentsCollection.findOne({ _id: new ObjectId(validated.parentId) });
      if (parentComment?.authorId && parentComment.authorId.toString() !== userId) {
        await notifyCommentReply(
          parentComment.authorId.toString(),
          userId,
          validated.postId,
          validated.parentId,
          post.title
        );
      }
    } else {
      // Notify post author (if not the commenter)
      if (post.authorId && post.authorId.toString() !== userId) {
        await notifyPostReply(
          post.authorId.toString(),
          userId,
          validated.postId,
          post.title
        );
      }
    }

    return NextResponse.json({
      message: 'Comment created successfully',
      comment: {
        ...newComment,
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

    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

