import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { Guild } from '@/lib/models/guild';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guildId = params.id;
    const guildsCollection = await getCollection<Guild>('guilds');
    const guild = await guildsCollection.findOne({ _id: guildId as any });

    if (!guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      );
    }

    // Check if user has access (optional auth for public guilds)
    const authHeader = request.headers.get('authorization');
    let userId: string | undefined;
    if (authHeader) {
      try {
        const { verifyAccessToken } = await import('@/lib/auth/jwt');
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        userId = payload.userId;
      } catch {
        // Invalid token, but guild might be public
      }
    }
    
    if (!guild.settings.public && (!userId || !guild.members.some(m => m.userId.toString() === userId && m.status === 'active'))) {
      return NextResponse.json(
        { error: 'Guild is private' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      guild: {
        ...guild,
        _id: guild._id?.toString(),
      },
    });
  } catch (error) {
    console.error('Get guild error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

