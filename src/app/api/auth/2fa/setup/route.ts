import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { User } from '@/lib/models/user';
import crypto from 'crypto';
import QRCode from 'qrcode';

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

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = crypto.randomBytes(20).toString('base32');
    const issuer = 'Opinion Arena Network';
    const accountName = user.email;
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    // Store secret temporarily (user needs to verify before enabling)
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { twoFactorSecret: secret } }
    );

    return NextResponse.json({
      secret,
      qrCode,
      manualEntryKey: secret,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

