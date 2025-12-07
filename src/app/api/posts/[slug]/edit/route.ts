import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { z } from 'zod';

const editPostSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: z.string().min(100).optional(),
  tags: z.array(z.string()).optional(),
});

async function handler(request: NextRequest) {
  try {
    const slug = (request as any).params?.slug;
    const userId = (request as any).user.userId;
    const body = await request.json();
    const validated = editPostSchema.parse(body);

    const postsCollection = await getCollection<Post>('posts');
    const post = await postsCollection.findOne({ slug });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (post.authorId?.toString() !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only edit your own posts' },
        { status: 403 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validated.title) updateData.title = validated.title;
    if (validated.content) {
      updateData.content = validated.content;
      updateData.excerpt = validated.content.substring(0, 160).replace(/\n/g, ' ').trim();
    }
    if (validated.tags) updateData.tags = validated.tags;

    await postsCollection.updateOne(
      { _id: post._id },
      { $set: updateData }
    );

    const updatedPost = await postsCollection.findOne({ _id: post._id });

    return NextResponse.json({
      message: 'Post updated successfully',
      post: {
        ...updatedPost,
        _id: updatedPost?._id?.toString(),
        topicId: updatedPost?.topicId?.toString(),
        authorId: updatedPost?.authorId?.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error editing post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = requireAuth(handler);

