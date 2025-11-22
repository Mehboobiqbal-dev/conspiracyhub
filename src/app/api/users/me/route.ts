import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { User } from '@/lib/models/user';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().or(z.literal('')).optional(),
});

async function handler(request: NextRequest) {
  try {
    if (request.method === 'GET') {
      const userId = (request as any).user.userId;
      const usersCollection = await getCollection<User>('users');
      const user = await usersCollection.findOne({ _id: userId as any });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: user._id?.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
        },
      });
    }

    if (request.method === 'PATCH') {
      const body = await request.json();
      const validated = updateUserSchema.parse(body);
      const userId = (request as any).user.userId;

      const usersCollection = await getCollection<User>('users');
      
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (validated.name) updateData.name = validated.name;
      if (validated.bio !== undefined) updateData.bio = validated.bio;
      if (validated.avatar !== undefined) {
        if (validated.avatar) {
          updateData.avatar = validated.avatar;
        } else {
          updateData.avatar = null;
        }
      }

      await usersCollection.updateOne(
        { _id: userId as any },
        { $set: updateData }
      );

      return NextResponse.json({ message: 'Profile updated successfully' });
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in user settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);
export const PATCH = requireAuth(handler);

