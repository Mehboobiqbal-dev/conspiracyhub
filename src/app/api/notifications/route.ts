import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Notification } from '@/lib/models/notification';
import { ObjectId } from 'mongodb';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const notificationsCollection = await getCollection<Notification>('notifications');
    
    const query: any = { userId: new ObjectId(userId) };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await notificationsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const unreadCount = await notificationsCollection.countDocuments({
      userId: new ObjectId(userId),
      read: false,
    });

    return NextResponse.json({
      notifications: notifications.map(n => ({
        ...n,
        _id: n._id?.toString(),
        userId: n.userId.toString(),
        relatedUserId: n.relatedUserId?.toString(),
        relatedPostId: n.relatedPostId?.toString(),
        relatedCommentId: n.relatedCommentId?.toString(),
        relatedTopicId: n.relatedTopicId?.toString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);

