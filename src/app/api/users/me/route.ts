import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import { User } from '@/lib/models/user';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(), // Allow empty string (empty string passes string validation)
  avatar: z.string().url().or(z.literal('')).optional(),
});

async function handler(request: NextRequest) {
  try {
    if (request.method === 'GET') {
      const userId = (request as any).user.userId;
      const usersCollection = await getCollection<User>('users');
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

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
      const userObjectId = new ObjectId(userId);
      
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.bio !== undefined) {
        // Allow empty string to clear bio - set to empty string, not null
        updateData.bio = validated.bio;
      }
      if (validated.avatar !== undefined) {
        if (validated.avatar === '') {
          updateData.$unset = { avatar: '' }; // Unset the avatar field
        } else {
          updateData.avatar = validated.avatar;
        }
      }

      // Handle $unset separately if needed
      if (updateData.$unset) {
        const { $unset, ...setData } = updateData;
        const result = await usersCollection.updateOne(
          { _id: userObjectId },
          { $set: setData, $unset: $unset }
        );
        console.log('Update result:', result);
      } else {
        const result = await usersCollection.updateOne(
          { _id: userObjectId },
          { $set: updateData }
        );
        console.log('Update result:', result, 'Update data:', updateData);
      }

      // Verify the update by fetching the user
      const updatedUser = await usersCollection.findOne({ _id: userObjectId });
      console.log('Updated user bio:', updatedUser?.bio);

      return NextResponse.json({ 
        message: 'Profile updated successfully',
        user: {
          bio: updatedUser?.bio,
          name: updatedUser?.name,
        }
      });
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

