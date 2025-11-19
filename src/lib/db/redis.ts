import type { RedisClientType as RedisClient } from 'redis';
import { createClient } from 'redis';
import { Redis as UpstashRedis } from '@upstash/redis';

type UpstashClient = InstanceType<typeof UpstashRedis>;

const useUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

let redisClient: RedisClient | null = null;
let upstashClient: UpstashClient | null = null;

async function getUpstashClient(): Promise<UpstashClient> {
  if (!upstashClient) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials are missing');
    }
    upstashClient = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return upstashClient;
}

async function getNodeRedisClient(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const useTls = process.env.REDIS_TLS === 'true';

  const client = createClient({
    url,
    socket: useTls
      ? {
          tls: true,
          rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
        }
      : undefined,
  });

  client.on('error', (err) => console.error('Redis Client Error', err));

  await client.connect();
  redisClient = client;
  return client;
}

async function getClient() {
  if (useUpstash) {
    return getUpstashClient();
  }
  return getNodeRedisClient();
}

export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  const serialized = JSON.stringify(value);

  if (useUpstash) {
    const client = await getUpstashClient();
    if (ttl) {
      await client.set(key, serialized, { ex: ttl });
    } else {
      await client.set(key, serialized);
    }
    return;
  }

  const client = await getNodeRedisClient();
  if (ttl) {
    await client.setEx(key, ttl, serialized);
  } else {
    await client.set(key, serialized);
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (useUpstash) {
    const client = await getUpstashClient();
    const value = await client.get<string | null>(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  const client = await getNodeRedisClient();
  const value = await client.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function deleteCache(key: string): Promise<void> {
  if (useUpstash) {
    const client = await getUpstashClient();
    await client.del(key);
    return;
  }

  const client = await getNodeRedisClient();
  await client.del(key);
}

export async function setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
  await setCache(`session:${sessionId}`, data, ttl);
}

export async function getSession<T = any>(sessionId: string): Promise<T | null> {
  return getCache<T>(`session:${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteCache(`session:${sessionId}`);
}

export async function getRedisClient() {
  return getClient();
}










