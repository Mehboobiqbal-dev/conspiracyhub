import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Post } from '@/lib/models/post';
import { Comment } from '@/lib/models/comment';
import { ObjectId } from 'mongodb';

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    const postsCollection = await getCollection<Post>('posts');
    const commentsCollection = await getCollection<Comment>('comments');

    let items: any[] = [];

    if (type === 'all' || type === 'posts') {
      const query: any = {};
      if (status === 'pending') {
        query.reportCount = { $gt: 0 };
        query.status = 'published';
      } else if (status === 'reviewed') {
        query.moderationStatus = { $exists: true };
      }

      const posts = await postsCollection
        .find(query)
        .sort({ reportCount: -1, createdAt: -1 })
        .limit(limit)
        .toArray();

      items.push(...posts.map(post => ({
        ...post,
        _id: post._id?.toString(),
        type: 'post',
        item: {
          _id: post._id?.toString(),
          title: post.title,
          content: post.content.substring(0, 200),
          authorId: post.authorId?.toString(),
          authorName: post.authorName,
          createdAt: post.createdAt,
        },
      })));
    }

    if (type === 'all' || type === 'comments') {
      const query: any = {};
      if (status === 'pending') {
        query.reportCount = { $gt: 0 };
        query.isDeleted = false;
      } else if (status === 'reviewed') {
        query.moderationStatus = { $exists: true };
      }

      const comments = await commentsCollection
        .find(query)
        .sort({ reportCount: -1, createdAt: -1 })
        .limit(limit)
        .toArray();

      items.push(...comments.map(comment => ({
        ...comment,
        _id: comment._id?.toString(),
        type: 'comment',
        item: {
          _id: comment._id?.toString(),
          content: comment.content.substring(0, 200),
          authorId: comment.authorId?.toString(),
          authorName: comment.authorName,
          createdAt: comment.createdAt,
        },
      })));
    }

    return NextResponse.json({
      items: items.sort((a, b) => 
        (b.reportCount || 0) - (a.reportCount || 0)
      ),
    });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireRole(['admin', 'moderator'])(handler);
