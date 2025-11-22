import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import type { AuthenticatedRequest } from '@/lib/middleware/auth';
import { z } from 'zod';
import { signPayload } from '@/lib/uploads/signing';
import crypto from 'crypto';

const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB

const signSchema = z.object({
  mimeType: z.string(),
  size: z.number().positive(),
  kind: z.enum(['image', 'video']),
});

async function handler(request: NextRequest) {
  try {
    const { user } = request as AuthenticatedRequest;
    const userId = user?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { mimeType, size, kind } = signSchema.parse(body);

    const allowedMime = kind === 'video' ? ALLOWED_VIDEO_MIME : ALLOWED_IMAGE_MIME;
    const maxBytes = kind === 'video' ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;

    if (!allowedMime.includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (size > maxBytes) {
      return NextResponse.json(
        { error: `File is too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)` },
        { status: 400 }
      );
    }

    const uploadId = crypto.randomUUID();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const payload = {
      uploadId,
      size,
      mimeType,
      kind,
      userId,
      expiresAt,
    };

    const signature = signPayload(payload);

    return NextResponse.json({
      uploadId,
      expiresAt,
      signature,
      maxBytes,
      uploadUrl: '/api/uploads',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error signing upload:', error);
    return NextResponse.json({ error: 'Failed to sign upload' }, { status: 500 });
  }
}

export const POST = requireAuth(handler);

