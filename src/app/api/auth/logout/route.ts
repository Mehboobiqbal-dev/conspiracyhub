import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { deleteSession } from '@/lib/db/redis';
import { User } from '@/lib/models/user';
import { decodeToken } from '@/lib/auth/jwt';

async function handler(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (refreshToken) {
      const decoded = decodeToken(refreshToken);
      if (decoded) {
        const usersCollection = await getCollection<User>('users');
        await usersCollection.updateOne(
          { _id: decoded.userId as any },
          { $pull: { refreshTokens: refreshToken } }
        );
        
        await deleteSession(`user:${decoded.userId}`);
      }
    }

    const response = NextResponse.json({ message: 'Logout successful' });
    
    // Clear cookies
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

