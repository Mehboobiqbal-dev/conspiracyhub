import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { User } from '@/lib/models/user';
import { z } from 'zod';
import { authenticator } from 'otplib';

const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifySchema.parse(body);
    const userId = (request as any).user.userId;
    const usersCollection = await getCollection<User>('users');
    const user = await usersCollection.findOne({ _id: userId as any });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA not set up' },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValid = authenticator.verify({
      token: validated.code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          twoFactorEnabled: true,
          updatedAt: new Date(),
        },
        $push: {
          auditLog: {
            action: '2fa_enabled',
            timestamp: new Date(),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        },
      }
    );

    return NextResponse.json({
      message: '2FA enabled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

