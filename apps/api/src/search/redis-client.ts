import { createRequire } from 'node:module';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
const RedisCtor = require('ioredis') as any;

type RedisClient = any;

let client: RedisClient | null = null;
let reconnectAttempts = 0;
let lastPingLatencyMs = -1;

function createClient(): RedisClient {
  const connectTimeout = env.redisConnectTimeoutMs;
  const maxRetries = env.redisMaxRetries;

  const redis = new RedisCtor(env.redisUrl, {
    lazyConnect: true,
    connectTimeout,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times: number) {
      reconnectAttempts = times;
      if (times > maxRetries) return null;
      return Math.min(1000 * 2 ** Math.min(times, 5), 15_000);
    },
    tls: env.redisUrl.startsWith('rediss://') ? {} : undefined,
  });

  redis.on('error', () => {
    // Keep process alive; fallback logic handles outages.
  });

  return redis;
}

export function getRedisClient(): RedisClient {
  if (!client) {
    client = createClient();
  }
  return client;
}

export async function ensureRedisConnected(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    return redis.status === 'ready';
  } catch {
    return false;
  }
}

export function isRedisConnected(): boolean {
  return !!client && client.status === 'ready';
}

export async function pingRedis(): Promise<number> {
  const redis = getRedisClient();
  const started = Date.now();
  await redis.ping();
  lastPingLatencyMs = Date.now() - started;
  return lastPingLatencyMs;
}

export function getRedisReconnectAttempts(): number {
  return reconnectAttempts;
}

export function getRedisLastPingLatencyMs(): number {
  return lastPingLatencyMs;
}

export async function getRedisMemoryUsageBytes(): Promise<number | null> {
  try {
    const redis = getRedisClient();
    const info = await redis.info('memory');
    const line = info
      .split('\n')
      .map((l: string) => l.trim())
      .find((l: string) => l.startsWith('used_memory:'));
    if (!line) return null;
    const value = Number(line.split(':')[1]);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  } finally {
    client = null;
  }
}
