import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Notification } from '@/lib/models/notification';
import { ObjectId } from 'mongodb';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = (request as any).user.userId;
    const notificationId = new ObjectId(id);

    const notificationsCollection = await getCollection<Notification>('notifications');
    
    const notification = await notificationsCollection.findOne({ _id: notificationId });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.userId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await notificationsCollection.updateOne(
      { _id: notificationId },
      { $set: { read: true } }
    );

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

