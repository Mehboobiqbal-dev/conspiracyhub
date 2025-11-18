import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Topic } from '@/lib/models/topic';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const postType = searchParams.get('postType') as 'conspiracy' | 'opinion' | null;
    const aiOnly = searchParams.get('aiOnly') === 'true';
    const topicSlug = searchParams.get('topic');
    const sort = searchParams.get('sort') || 'relevance';
    const timeRange = searchParams.get('timeRange') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!q.trim()) {
      return NextResponse.json({ posts: [], topics: [] });
    }

    const postsCollection = await getCollection<Post>('posts');
    const topicsCollection = await getCollection<Topic>('topics');

    // Build post query
    const postQuery: any = {
      status: 'published',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ],
    };

    if (postType) {
      postQuery.type = postType;
    }

    if (aiOnly) {
      postQuery.isAIGenerated = true;
    }

    if (topicSlug) {
      postQuery.topicSlug = topicSlug;
    }

    if (timeRange !== 'all') {
      const now = new Date();
      if (timeRange === '24h') {
        now.setHours(now.getHours() - 24);
      } else if (timeRange === '7d') {
        now.setDate(now.getDate() - 7);
      } else if (timeRange === '30d') {
        now.setDate(now.getDate() - 30);
      } else if (timeRange === '1y') {
        now.setFullYear(now.getFullYear() - 1);
      }
      postQuery.createdAt = { $gte: now };
    }

    // Build sort
    let sortOption: any = { createdAt: -1 };
    if (sort === 'relevance') {
      // Simple relevance: title matches first, then content
      sortOption = { createdAt: -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'top') {
      sortOption = { upvotes: -1, createdAt: -1 };
    } else if (sort === 'trending') {
      // Trending = high upvotes + recent
      sortOption = { upvotes: -1, createdAt: -1 };
    }

    const posts = await postsCollection
      .find(postQuery)
      .sort(sortOption)
      .limit(limit)
      .toArray();

    // Search topics
    const topicQuery: any = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
    };

    const topics = await topicsCollection
      .find(topicQuery)
      .sort({ postCount: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        topicId: post.topicId?.toString(),
        authorId: post.authorId?.toString(),
      })),
      topics: topics.map(topic => ({
        ...topic,
        _id: topic._id?.toString(),
      })),
      query: q,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

