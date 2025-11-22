import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { getCollection } from '@/lib/db/mongodb';
import { setSession } from '@/lib/db/redis';
import { User } from '@/lib/models/user';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value || 
                        request.headers.get('x-refresh-token');

    if (!refreshToken) {
      console.error('Refresh token missing from request');
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Verify token exists in user's refresh tokens
    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ 
      _id: payload.userId as any,
    });

    if (!user) {
      console.error('User not found for refresh token:', payload.userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Check if refresh token exists in user's refresh tokens array
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      console.error('Refresh token not found in user\'s refresh tokens');
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    // Update refresh tokens
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $pull: { refreshTokens: refreshToken },
        $push: { refreshTokens: newRefreshToken },
      }
    );

    // Update session
    await setSession(`user:${payload.userId}`, {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    }, 3600);

    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    // Set new cookies
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 }
    );
  }
}

