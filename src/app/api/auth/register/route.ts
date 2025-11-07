import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { getCollection } from '@/lib/db/mongodb';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { setSession } from '@/lib/db/redis';
import { User } from '@/lib/models/user';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validated.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password validation failed', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const usersCollection = await getCollection<User>('users');
    const existingUser = await usersCollection.findOne({ email: validated.email.toLowerCase() });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user
    const newUser: Omit<User, '_id'> = {
      email: validated.email.toLowerCase(),
      passwordHash,
      name: validated.name,
      role: 'user',
      emailVerified: false,
      twoFactorEnabled: false,
      preferences: {
        theme: 'system',
        notifications: true,
        emailNotifications: true,
        smsNotifications: false,
      },
      oauthProviders: {},
      subscriptionTier: 'free',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      auditLog: [{
        action: 'register',
        timestamp: new Date(),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }],
    };

    const result = await usersCollection.insertOne(newUser as User);
    const userId = result.insertedId.toString();

    // Generate tokens
    const accessToken = generateAccessToken({
      userId,
      email: validated.email.toLowerCase(),
      role: 'user',
    });

    const refreshToken = generateRefreshToken({
      userId,
      email: validated.email.toLowerCase(),
      role: 'user',
    });

    // Store refresh token in user document
    await usersCollection.updateOne(
      { _id: result.insertedId },
      { $push: { refreshTokens: refreshToken } }
    );

    // Store session in Redis
    await setSession(`user:${userId}`, {
      userId,
      email: validated.email.toLowerCase(),
      role: 'user',
    }, 3600);

    const response = NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: userId,
        email: validated.email.toLowerCase(),
        name: validated.name,
        role: 'user',
      },
      accessToken,
      refreshToken,
    }, { status: 201 });

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

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

