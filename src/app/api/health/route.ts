import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/mongodb';
import { getRedisClient } from '@/lib/db/redis';

export async function GET() {
  try {
    // Check MongoDB connection
    const db = await getDatabase();
    await db.admin().ping();

    // Check Redis connection
    const redis = await getRedisClient();
    await redis.ping();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

