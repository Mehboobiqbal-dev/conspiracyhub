import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { User, sanitizeUser } from '@/lib/models/user';

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;
    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ _id: userId as any });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);

