import { env } from '../config/env.js';
import { SEARCH_CACHE_TTL_SECONDS } from './search.constants.js';
import { searchMetrics } from './search-metrics.js';
import { ensureRedisConnected, isRedisConnected } from './redis-client.js';
import { RedisSearchCacheAdapter } from './redis-search-cache.js';
import type { SearchCache } from './search.types.js';

type CacheEntry = { value: unknown; expiresAt: number };

class InMemorySearchCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlSeconds: number;

  constructor(maxEntries: number, defaultTtlSeconds: number) {
    this.maxEntries = maxEntries;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  get<T>(key: string): T | null {
    this.cleanupExpired();
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    this.cleanupExpired();
    this.store.delete(key);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ?? this.defaultTtlSeconds) * 1000,
    });
    this.evictOverflow();
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clearByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clearAll(): void {
    this.store.clear();
  }

  size(): number {
    this.cleanupExpired();
    return this.store.size;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private evictOverflow(): void {
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (!oldest) break;
      this.store.delete(oldest);
    }
  }
}

class HybridSearchCache implements SearchCache {
  providerName: 'memory' | 'redis' | 'hybrid' = 'hybrid';
  private readonly memory: InMemorySearchCache;
  private readonly redis: RedisSearchCacheAdapter | null;

  constructor(memory: InMemorySearchCache, redis: RedisSearchCacheAdapter | null) {
    this.memory = memory;
    this.redis = redis;
    this.providerName = redis ? 'hybrid' : 'memory';
    if (redis) {
      void ensureRedisConnected();
    }
  }

  get<T>(key: string): T | null {
    const mem = this.memory.get<T>(key);
    if (mem !== null) {
      searchMetrics.recordCacheHit();
      return mem;
    }

    if (this.redis && isRedisConnected()) {
      void this.redis.get<T>(key).then((cached) => {
        if (cached !== null) this.memory.set(key, cached);
      });
    } else if (this.redis) {
      void ensureRedisConnected();
    }

    searchMetrics.recordCacheMiss();
    return null;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ?? defaultTtlFromEnv;
    this.memory.set(key, value, ttl);
    if (this.redis) {
      if (!isRedisConnected()) void ensureRedisConnected();
      void this.redis.set(key, value, ttl).catch(() => {
        // Degrade to memory silently.
      });
    }
  }

  delete(key: string): void {
    this.memory.delete(key);
    if (this.redis) void this.redis.delete(key);
  }

  clearByPrefix(prefix: string): void {
    this.memory.clearByPrefix(prefix);
    if (this.redis) void this.redis.clearByPrefix(prefix);
  }

  clearAll(): void {
    this.memory.clearAll();
    if (this.redis) void this.redis.clearAll();
  }

  isRedisConnected(): boolean {
    return isRedisConnected();
  }

  size(): number {
    return this.memory.size();
  }
}

const defaultTtlFromEnv = env.cacheTtlMs
  ? Math.max(Math.floor(env.cacheTtlMs / 1000), 1)
  : SEARCH_CACHE_TTL_SECONDS;

const memoryCache = new InMemorySearchCache(env.cacheMaxEntries, defaultTtlFromEnv);
const redisAdapter = env.searchCacheProvider === 'redis' ? new RedisSearchCacheAdapter() : null;

export const searchCache: SearchCache = new HybridSearchCache(memoryCache, redisAdapter);
