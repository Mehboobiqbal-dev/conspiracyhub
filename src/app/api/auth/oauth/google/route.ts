import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { setSession } from '@/lib/db/redis';
import { User } from '@/lib/models/user';
import { z } from 'zod';

const oauthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
  accessToken: z.string().min(1, 'Access token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = oauthSchema.parse(body);

    // Verify Google token (in production, use google-auth-library)
    // For now, we'll decode and validate the token structure
    // In production, verify with Google's API
    let googleUser: { email: string; name: string; sub: string };
    
    try {
      // Decode JWT token (without verification for now - implement proper verification)
      const payload = JSON.parse(Buffer.from(validated.idToken.split('.')[1], 'base64').toString());
      googleUser = {
        email: payload.email,
        name: payload.name || payload.given_name || 'User',
        sub: payload.sub,
      };
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection<User>('users');
    let user = await usersCollection.findOne({ 
      email: googleUser.email.toLowerCase() 
    });

    if (user) {
      // Update OAuth provider info
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            'oauthProviders.google': googleUser.sub,
            lastLogin: new Date(),
            updatedAt: new Date(),
          },
          $push: {
            auditLog: {
              action: 'oauth_login',
              timestamp: new Date(),
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
            },
          },
        }
      );
    } else {
      // Create new user
      const newUser: Omit<User, '_id'> = {
        email: googleUser.email.toLowerCase(),
        passwordHash: '', // OAuth users don't have passwords
        name: googleUser.name,
        role: 'user',
        emailVerified: true, // Google emails are verified
        twoFactorEnabled: false,
        preferences: {
          theme: 'system',
          notifications: true,
          emailNotifications: true,
          smsNotifications: false,
        },
        oauthProviders: {
          google: googleUser.sub,
        },
        subscriptionTier: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        auditLog: [{
          action: 'oauth_register',
          timestamp: new Date(),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        }],
      };

      const result = await usersCollection.insertOne(newUser as User);
      user = { ...newUser, _id: result.insertedId } as User;
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    const userId = user._id!.toString();

    // Generate tokens
    const accessToken = generateAccessToken({
      userId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId,
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await usersCollection.updateOne(
      { _id: user._id },
      { $push: { refreshTokens: refreshToken } }
    );

    // Store session
    await setSession(`user:${userId}`, {
      userId,
      email: user.email,
      role: user.role,
    }, 3600);

    const response = NextResponse.json({
      message: 'OAuth login successful',
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        subscriptionTier: user.subscriptionTier,
      },
      accessToken,
      refreshToken,
    });

    // Set cookies
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

