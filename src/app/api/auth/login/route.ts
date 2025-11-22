import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth/password';
import { getCollection } from '@/lib/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { setSession } from '@/lib/db/redis';
import { User } from '@/lib/models/user';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ 
      email: validated.email.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    const userId = user._id!.toString();
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { lastLogin: new Date(), updatedAt: new Date() },
        $push: {
          auditLog: {
            action: 'login',
            timestamp: new Date(),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        },
      }
    );

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

    // Store refresh token (initialize array if it doesn't exist)
    if (!user.refreshTokens || !Array.isArray(user.refreshTokens)) {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { refreshTokens: [refreshToken] } }
      );
    } else {
      await usersCollection.updateOne(
        { _id: user._id },
        { $push: { refreshTokens: refreshToken } }
      );
    }

    // Store session in Redis
    await setSession(`user:${userId}`, {
      userId,
      email: user.email,
      role: user.role,
    }, 3600);

    const response = NextResponse.json({
      message: 'Login successful',
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

    // Set HTTP-only cookies
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

