import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', (err) => console.error('Redis Client Error', err));

  await client.connect();
  redisClient = client;
  return client;
}

export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  const client = await getRedisClient();
  const serialized = JSON.stringify(value);
  if (ttl) {
    await client.setEx(key, ttl, serialized);
  } else {
    await client.set(key, serialized);
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  const value = await client.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function deleteCache(key: string): Promise<void> {
  const client = await getRedisClient();
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

