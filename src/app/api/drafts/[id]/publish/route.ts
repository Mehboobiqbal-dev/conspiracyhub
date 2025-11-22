import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Draft } from '@/lib/models/draft';
import { Post, generateSlug } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';
import { User } from '@/lib/models/user';
import { ObjectId } from 'mongodb';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const draftId = new ObjectId(id);
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const authorObjectId = new ObjectId(userId);

    const draftsCollection = await getCollection<Draft>('drafts');
    const postsCollection = await getCollection<Post>('posts');
    const topicsCollection = await getCollection<Topic>('topics');
    const usersCollection = await getCollection<User>('users');

    const draft = await draftsCollection.findOne({ _id: draftId, authorId: authorObjectId });

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (!draft.title || draft.title.trim().length < 5) {
      return NextResponse.json({ error: 'Draft title is too short' }, { status: 400 });
    }

    if (!draft.content || draft.content.replace(/<[^>]+>/g, '').trim().length < 100) {
      return NextResponse.json({ error: 'Draft content is too short' }, { status: 400 });
    }

    const baseSlug = generateSlug(draft.title);
    let slug = baseSlug;
    let suffix = 1;
    while (await postsCollection.findOne({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    let topicId: ObjectId | undefined;
    if (draft.topicSlug) {
      const topic = await topicsCollection.findOne({ slug: draft.topicSlug });
      if (topic) {
        topicId = topic._id;
      }
    }

    const now = new Date();
    const status = draft.status === 'scheduled' && draft.scheduledFor && draft.scheduledFor > now
      ? 'scheduled'
      : 'published';

    const userDoc = await usersCollection.findOne({ _id: authorObjectId });

    const post: Omit<Post, '_id'> = {
      title: draft.title,
      content: draft.content,
      type: draft.type,
      topicId: topicId || undefined,
      topicSlug: draft.topicSlug,
      authorId: authorObjectId,
      authorName: userDoc?.name || 'Anonymous',
      isAIGenerated: false,
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      views: 0,
      tags: draft.tags || [],
      slug,
      status,
      visibility: draft.visibility || 'public',
      createdAt: now,
      updatedAt: now,
      publishedAt: status === 'published' ? now : draft.scheduledFor,
      scheduledFor: draft.scheduledFor,
      featuredImage: draft.featuredImage,
      excerpt: draft.excerpt || draft.content.substring(0, 160),
      media: draft.media,
    };

    const result = await postsCollection.insertOne(post as Post);

    if (topicId) {
      await topicsCollection.updateOne({ _id: topicId }, { $inc: { postCount: 1 } });
    }

    await draftsCollection.deleteOne({ _id: draftId });

    return NextResponse.json({
      message: 'Draft published',
      postId: result.insertedId.toString(),
      slug,
    });
  } catch (error) {
    console.error('Publish draft error:', error);
    return NextResponse.json(
      { error: 'Failed to publish draft' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);


