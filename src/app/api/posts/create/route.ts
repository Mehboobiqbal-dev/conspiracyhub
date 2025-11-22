import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post, PostMedia, generateSlug } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';
import { User } from '@/lib/models/user';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const mediaSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video']),
  caption: z.string().optional(),
  altText: z.string().optional(),
  thumbnail: z.string().optional(),
});

const createPostSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(100).max(10000),
  type: z.enum(['conspiracy', 'opinion']),
  topicSlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  featuredImage: z.string().optional(),
  media: z.array(mediaSchema).optional(),
  publishAt: z.string().datetime().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createPostSchema.parse(body);
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postsCollection = await getCollection<Post>('posts');
    const topicsCollection = await getCollection<Topic>('topics');

    // Check if slug already exists
    const baseSlug = generateSlug(validated.title);
    let slug = baseSlug;
    let slugExists = await postsCollection.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      slugExists = await postsCollection.findOne({ slug });
      counter++;
    }

    // Get topic if provided
    let topicId: ObjectId | undefined;
    let topicSlug = null;
    if (validated.topicSlug) {
      const topic = await topicsCollection.findOne({ slug: validated.topicSlug });
      if (topic) {
        topicId = topic._id;
        topicSlug = topic.slug;
      }
    }

    // Get user info
    const usersCollection = await getCollection<User>('users');
    const authorObjectId = new ObjectId(userId);
    const authorRecord = await usersCollection.findOne({ _id: authorObjectId });
    const authorName = authorRecord?.name || 'Anonymous';

    // Generate excerpt for SEO
    const excerpt = (validated.excerpt || validated.content.substring(0, 160)).replace(/\n/g, ' ').trim();
    const media = (validated.media as PostMedia[]) || [];
    const publishAt = validated.publishAt ? new Date(validated.publishAt) : null;
    const isScheduled = publishAt && publishAt.getTime() > Date.now() + 60 * 1000;

    const newPost: Omit<Post, '_id'> = {
      title: validated.title,
      content: validated.content,
      type: validated.type,
      topicId: topicId || undefined,
      topicSlug: topicSlug || undefined,
      authorId: authorObjectId,
      authorName,
      isAIGenerated: false,
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      views: 0,
      tags: validated.tags || [],
      slug,
      status: isScheduled ? 'scheduled' : 'published',
      visibility: validated.visibility || 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: isScheduled ? publishAt || undefined : new Date(),
      scheduledFor: isScheduled ? publishAt || undefined : undefined,
      excerpt,
      featuredImage: validated.featuredImage,
      media,
    };

    const result = await postsCollection.insertOne(newPost as Post);

    // Update topic post count
    if (topicId && !isScheduled) {
      await topicsCollection.updateOne(
        { _id: topicId },
        { $inc: { postCount: 1 } }
      );
    }

    return NextResponse.json({
      message: 'Post created successfully',
      post: {
        ...newPost,
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

    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

