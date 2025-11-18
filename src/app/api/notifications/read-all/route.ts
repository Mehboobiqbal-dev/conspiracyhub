import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Notification } from '@/lib/models/notification';
import { ObjectId } from 'mongodb';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;

    const notificationsCollection = await getCollection<Notification>('notifications');
    
    await notificationsCollection.updateMany(
      { userId: new ObjectId(userId), read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

