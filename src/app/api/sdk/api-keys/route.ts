import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getCollection } from '@/lib/db/mongodb';
import crypto from 'crypto';
import { z } from 'zod';

interface ApiKey {
  _id?: any;
  userId: any;
  key: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
});

async function handler(request: NextRequest) {
  try {
    const userId = (request as any).user.userId;

    if (request.method === 'POST') {
      const body = await request.json();
      const validated = createKeySchema.parse(body);

      const apiKeysCollection = await getCollection<ApiKey>('api_keys');
      const apiKey = crypto.randomBytes(32).toString('hex');
      const keyPrefix = 'oan_';

      const newKey: Omit<ApiKey, '_id'> = {
        userId: userId as any,
        key: `${keyPrefix}${apiKey}`,
        name: validated.name,
        permissions: validated.permissions || ['read'],
        createdAt: new Date(),
        isActive: true,
      };

      const result = await apiKeysCollection.insertOne(newKey as ApiKey);

      return NextResponse.json({
        apiKey: newKey.key,
        keyId: result.insertedId.toString(),
        name: newKey.name,
        permissions: newKey.permissions,
        createdAt: newKey.createdAt,
      }, { status: 201 });
    } else {
      // GET - list user's API keys
      const apiKeysCollection = await getCollection<ApiKey>('api_keys');
      const keys = await apiKeysCollection
        .find({ userId: userId as any, isActive: true })
        .sort({ createdAt: -1 })
        .toArray();

      return NextResponse.json({
        keys: keys.map(k => ({
          keyId: k._id?.toString(),
          name: k.name,
          permissions: k.permissions,
          createdAt: k.createdAt,
          lastUsed: k.lastUsed,
          // Don't return full key for security
          keyPreview: `${k.key.substring(0, 10)}...`,
        })),
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(handler);
export const POST = requireAuth(handler);

