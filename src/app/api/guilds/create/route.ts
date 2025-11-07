import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { Guild } from '@/lib/models/guild';
import { z } from 'zod';

const createGuildSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  theme: z.string().min(1),
  public: z.boolean().default(true),
  inviteOnly: z.boolean().default(false),
  requireApproval: z.boolean().default(false),
  maxMembers: z.number().min(10).max(10000).optional(),
});

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createGuildSchema.parse(body);
    const userId = (request as any).user.userId;

    const guildsCollection = await getCollection<Guild>('guilds');
    const guild: Omit<Guild, '_id'> = {
      name: validated.name,
      description: validated.description,
      theme: validated.theme,
      ownerId: userId as any,
      members: [{
        userId: userId as any,
        role: 'owner',
        joinedAt: new Date(),
        status: 'active',
      }],
      settings: {
        public: validated.public,
        inviteOnly: validated.inviteOnly,
        requireApproval: validated.requireApproval,
        maxMembers: validated.maxMembers,
      },
      forums: [],
      challenges: [],
      stats: {
        totalMembers: 1,
        totalPosts: 0,
        activeMembers: 1,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await guildsCollection.insertOne(guild as Guild);

    return NextResponse.json({
      guildId: result.insertedId.toString(),
      guild: {
        ...guild,
        _id: result.insertedId.toString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create guild error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

