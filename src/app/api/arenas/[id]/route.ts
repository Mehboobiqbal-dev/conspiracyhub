import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Arena } from '@/lib/models/arena';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const arenaId = params.id;
    const arenasCollection = await getCollection<Arena>('arenas');
    const arena = await arenasCollection.findOne({ _id: arenaId as any });

    if (!arena) {
      return NextResponse.json(
        { error: 'Arena not found' },
        { status: 404 }
      );
    }

    // Check if user has access (optional auth for public arenas)
    const authHeader = request.headers.get('authorization');
    let userId: string | undefined;
    if (authHeader) {
      try {
        const { verifyAccessToken } = await import('@/lib/auth/jwt');
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        userId = payload.userId;
      } catch {
        // Invalid token, but arena might be public
      }
    }
    
    if (!arena.settings.public && (!userId || !arena.participants.some(p => p.userId.toString() === userId))) {
      return NextResponse.json(
        { error: 'Arena is private' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      arena: {
        ...arena,
        _id: arena._id?.toString(),
      },
    });
  } catch (error) {
    console.error('Get arena error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = handler;

