import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { UserFollow, UserStats } from '@/lib/models/user-follow';
import { Notification } from '@/lib/models/notification';
import { ObjectId } from 'mongodb';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const followerId = (request as any).user.userId;
    const followingId = new ObjectId(id);

    if (followerId === followingId.toString()) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const followsCollection = await getCollection<UserFollow>('user_follows');
    const statsCollection = await getCollection<UserStats>('user_stats');
    const notificationsCollection = await getCollection<Notification>('notifications');

    const existingFollow = await followsCollection.findOne({
      followerId: new ObjectId(followerId),
      followingId,
    });

    if (request.method === 'POST') {
      if (existingFollow) {
        return NextResponse.json({ following: true, message: 'Already following' });
      }

      await followsCollection.insertOne({
        followerId: new ObjectId(followerId),
        followingId,
        createdAt: new Date(),
      });

      // Update follower's following count
      await statsCollection.updateOne(
        { userId: new ObjectId(followerId) },
        { $inc: { followingCount: 1 } },
        { upsert: true }
      );

      // Update following user's follower count
      await statsCollection.updateOne(
        { userId: followingId },
        { $inc: { followerCount: 1 } },
        { upsert: true }
      );

      // Create notification
      await notificationsCollection.insertOne({
        userId: followingId,
        type: 'user_follow',
        title: 'New Follower',
        message: 'Someone started following you',
        link: `/u/${followerId}`,
        relatedUserId: new ObjectId(followerId),
        read: false,
        createdAt: new Date(),
      });

      return NextResponse.json({ following: true, message: 'Now following user' });
    }

    if (request.method === 'DELETE') {
      if (!existingFollow) {
        return NextResponse.json({ following: false, message: 'Not following' });
      }

      await followsCollection.deleteOne({
        followerId: new ObjectId(followerId),
        followingId,
      });

      // Update counts
      await statsCollection.updateOne(
        { userId: new ObjectId(followerId) },
        { $inc: { followingCount: -1 } }
      );

      await statsCollection.updateOne(
        { userId: followingId },
        { $inc: { followerCount: -1 } }
      );

      return NextResponse.json({ following: false, message: 'Unfollowed user' });
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  } catch (error) {
    console.error('Error handling follow:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);
export const DELETE = requireAuth(handler);

