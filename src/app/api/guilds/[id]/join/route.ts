import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Guild } from '@/lib/models/guild';

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = (request as any).user.userId;
    const guildId = params.id;

    const guildsCollection = await getCollection<Guild>('guilds');
    const guild = await guildsCollection.findOne({ _id: guildId as any });

    if (!guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      );
    }

    if (guild.members.some(m => m.userId.toString() === userId && m.status === 'active')) {
      return NextResponse.json(
        { error: 'Already a member' },
        { status: 400 }
      );
    }

    if (guild.settings.maxMembers && guild.stats.totalMembers >= guild.settings.maxMembers) {
      return NextResponse.json(
        { error: 'Guild is full' },
        { status: 400 }
      );
    }

    if (guild.settings.inviteOnly) {
      return NextResponse.json(
        { error: 'Guild is invite-only' },
        { status: 403 }
      );
    }

    // Get user info
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ _id: userId as any });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const memberStatus = guild.settings.requireApproval ? 'pending' : 'active';
    const role = 'member';

    await guildsCollection.updateOne(
      { _id: guild._id },
      {
        $push: {
          members: {
            userId: userId as any,
            role,
            joinedAt: new Date(),
            status: memberStatus,
          },
        },
        $inc: {
          'stats.totalMembers': 1,
          'stats.activeMembers': memberStatus === 'active' ? 1 : 0,
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: memberStatus === 'pending' ? 'Join request submitted' : 'Joined guild successfully',
      requiresApproval: guild.settings.requireApproval,
    });
  } catch (error) {
    console.error('Join guild error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

