import { env } from '../config/env.js';
import { getRedisLastPingLatencyMs, getRedisMemoryUsageBytes, getRedisReconnectAttempts, isRedisConnected, pingRedis } from './redis-client.js';
import { searchCache } from './search.cache.js';
import type { SearchHealthSnapshot } from './search-admin.types.js';
import { searchMetrics } from './search-metrics.js';
import { getRecentSlowQueries } from './search-profiler.js';

export async function getSearchHealth(): Promise<SearchHealthSnapshot> {
  const metrics = searchMetrics.getSnapshot();
  let redisPingLatencyMs = -1;
  let redisMemoryUsageBytes: number | null = null;

  if (env.searchCacheProvider === 'redis' && isRedisConnected()) {
    try {
      redisPingLatencyMs = await Promise.race<number>([
        pingRedis(),
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(env.redisPingTimeoutMs), env.redisPingTimeoutMs),
        ),
      ]);
      redisMemoryUsageBytes = await getRedisMemoryUsageBytes();
    } catch {
      redisPingLatencyMs = getRedisLastPingLatencyMs();
    }
  }

  const redisConnected = searchCache.isRedisConnected?.() ?? false;

  return {
    cacheProvider: searchCache.providerName ?? env.searchCacheProvider,
    providerMode: redisConnected ? 'redis' : 'memory-fallback',
    cacheSize: searchCache.size?.() ?? 0,
    cacheHitRatioPct: metrics.cacheHitRatioPct,
    p95LatencyMs: metrics.p95LatencyMs,
    averageLatencyMs: metrics.averageResponseTimeMs,
    invalidationCount: metrics.invalidationCount,
    activeSearchEngine: env.searchEngine,
    redisConnected,
    redisPingLatencyMs,
    redisMemoryUsageBytes,
    redisReconnectAttempts: getRedisReconnectAttempts(),
    slowQueryCount: Math.max(metrics.slowQueries, getRecentSlowQueries().length),
  };
}
