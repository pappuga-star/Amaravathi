import { ensureRedisConnected, getRedisClient, isRedisConnected } from './redis-client.js';

const SCAN_COUNT = 200;

export class RedisSearchCacheAdapter {
  async isConnected(): Promise<boolean> {
    if (isRedisConnected()) return true;
    return ensureRedisConnected();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!(await this.isConnected())) return null;
    try {
      const raw = await getRedisClient().get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!(await this.isConnected())) throw new Error('REDIS_UNAVAILABLE');
    await getRedisClient().set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSeconds));
  }

  async delete(key: string): Promise<void> {
    if (!(await this.isConnected())) return;
    await getRedisClient().del(key);
  }

  async clearByPrefix(prefix: string): Promise<void> {
    if (!(await this.isConnected())) return;
    const redis = getRedisClient();
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', SCAN_COUNT);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  async clearAll(): Promise<void> {
    if (!(await this.isConnected())) return;
    await getRedisClient().flushdb();
  }

  async size(): Promise<number> {
    if (!(await this.isConnected())) return 0;
    return getRedisClient().dbsize();
  }
}
