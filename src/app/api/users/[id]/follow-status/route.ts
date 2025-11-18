import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { UserFollow } from '@/lib/models/user-follow';
import { ObjectId } from 'mongodb';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const followingId = new ObjectId(id);

    // Try to get current user
    let followerId = null;
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        followerId = payload.userId;
      } catch {
        // Not authenticated, that's fine
      }
    }

    if (!followerId) {
      return NextResponse.json({ following: false });
    }

    const followsCollection = await getCollection<UserFollow>('user_follows');
    const follow = await followsCollection.findOne({
      followerId: new ObjectId(followerId),
      followingId,
    });

    return NextResponse.json({ following: !!follow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json({ following: false });
  }
}

