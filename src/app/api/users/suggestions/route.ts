import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { User } from '@/lib/models/user';
import { UserFollow } from '@/lib/models/user-follow';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/middleware/auth';

const SUGGESTION_LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    let currentUserId: string | null = null;
    const authAttempt = await authenticateRequest(request);
    if ('user' in authAttempt) {
      currentUserId = authAttempt.user.userId;
    }

    const followsCollection = await getCollection<UserFollow>('user_follows');
    const usersCollection = await getCollection<User>('users');

    const followerAggregation = await followsCollection
      .aggregate([
        { $group: { _id: '$followingId', followerCount: { $sum: 1 } } },
        { $sort: { followerCount: -1 } },
        { $limit: 50 },
      ])
      .toArray();

    const rankedIds = followerAggregation
      .map(entry => entry._id)
      .filter((id): id is ObjectId => Boolean(id));

    const followerMap = new Map<string, number>();
    followerAggregation.forEach(entry => {
      if (entry._id) {
        followerMap.set(entry._id.toString(), entry.followerCount);
      }
    });

    const baseUsers = await usersCollection
      .find({
        _id: { $in: rankedIds },
        isActive: { $ne: false },
      })
      .project({ name: 1, bio: 1, avatar: 1 })
      .toArray();

    const suggestions: Array<{
      id: string;
      name: string;
      bio?: string;
      avatar?: string;
      followerCount: number;
    }> = baseUsers.map(userDoc => ({
      id: userDoc._id!.toString(),
      name: userDoc.name,
      bio: userDoc.bio,
      avatar: userDoc.avatar || undefined,
      followerCount: followerMap.get(userDoc._id!.toString()) || 0,
    }));

    const exclusionSet = new Set<string>();
    if (currentUserId) {
      const alreadyFollowed = await followsCollection
        .find({ followerId: new ObjectId(currentUserId) })
        .project({ followingId: 1 })
        .toArray();
      alreadyFollowed.forEach(entry => {
        if (entry.followingId) {
          exclusionSet.add(entry.followingId.toString());
        }
      });
      exclusionSet.add(currentUserId);
    }

    let filtered = suggestions.filter((suggestion, index, self) => {
      if (exclusionSet.has(suggestion.id)) {
        return false;
      }
      return self.findIndex(item => item.id === suggestion.id) === index;
    });

    if (filtered.length < SUGGESTION_LIMIT) {
      const fallback = await usersCollection
        .find({
          _id: {
            $nin: [
              ...filtered.map((item) => new ObjectId(item.id)),
              ...(currentUserId ? [new ObjectId(currentUserId)] : []),
            ],
          },
          isActive: { $ne: false },
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .project({ name: 1, bio: 1, avatar: 1 })
        .toArray();

      for (const userDoc of fallback) {
        if (filtered.length >= SUGGESTION_LIMIT) break;
        const id = userDoc._id!.toString();
        if (exclusionSet.has(id) || filtered.some(item => item.id === id)) {
          continue;
        }
        filtered.push({
          id,
          name: userDoc.name,
          bio: userDoc.bio,
          avatar: userDoc.avatar || undefined,
          followerCount: 0,
        });
      }
    }

    return NextResponse.json({
      suggestions: filtered.slice(0, SUGGESTION_LIMIT),
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

