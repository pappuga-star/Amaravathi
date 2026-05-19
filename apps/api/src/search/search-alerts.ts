import { env } from '../config/env.js';
import { getSearchHealth } from './search-health.js';
import type { SearchAlert } from './search-admin.types.js';
import { searchMetrics } from './search-metrics.js';

let lastBenchmark: { engine: string; warmMs: number }[] = [];

export function setLatestBenchmark(results: Array<{ engine: string; warmMs: number }>): void {
  lastBenchmark = results;
}

export async function getSearchAlerts(): Promise<SearchAlert[]> {
  const alerts: SearchAlert[] = [];
  const health = await getSearchHealth();
  const now = new Date().toISOString();

  if (health.cacheHitRatioPct < env.searchAlertMinHitRatioPct) {
    alerts.push({
      code: 'CACHE_HIT_RATIO_LOW',
      severity: 'warning',
      at: now,
      message: `Cache hit ratio is ${health.cacheHitRatioPct}% (< ${env.searchAlertMinHitRatioPct}%).`,
    });
  }

  if (health.p95LatencyMs > env.searchAlertP95LatencyMs) {
    alerts.push({
      code: 'P95_LATENCY_HIGH',
      severity: 'critical',
      at: now,
      message: `p95 latency is ${health.p95LatencyMs}ms (> ${env.searchAlertP95LatencyMs}ms).`,
    });
  }

  const slowRate = searchMetrics.getSlowQueryRatePct();
  if (slowRate > env.searchAlertSlowQueryPct) {
    alerts.push({
      code: 'SLOW_QUERY_RATE_HIGH',
      severity: 'warning',
      at: now,
      message: `Slow query rate is ${slowRate}% (> ${env.searchAlertSlowQueryPct}%).`,
    });
  }

  if (env.searchCacheProvider === 'redis' && !health.redisConnected) {
    alerts.push({
      code: 'REDIS_UNAVAILABLE',
      severity: 'critical',
      at: now,
      message: 'Redis cache provider is configured but currently unavailable; fallback is active.',
    });
  }
  if (health.redisPingLatencyMs != null && health.redisPingLatencyMs >= 0 && health.redisPingLatencyMs > env.searchAlertP95LatencyMs) {
    alerts.push({
      code: 'REDIS_PING_HIGH',
      severity: 'warning',
      at: now,
      message: `Redis ping latency is ${health.redisPingLatencyMs}ms (> ${env.searchAlertP95LatencyMs}ms).`,
    });
  }
  if ((health.redisReconnectAttempts ?? 0) > env.redisMaxRetries) {
    alerts.push({
      code: 'REDIS_RECONNECT_EXCEEDED',
      severity: 'critical',
      at: now,
      message: `Redis reconnect attempts exceeded configured max (${env.redisMaxRetries}).`,
    });
  }

  const regex = lastBenchmark.find((r) => r.engine === 'regex');
  const prefix = lastBenchmark.find((r) => r.engine === 'prefix');
  if (regex && prefix && prefix.warmMs > 0) {
    const regressionPct = Number((((prefix.warmMs - regex.warmMs) / regex.warmMs) * 100).toFixed(2));
    if (regressionPct > env.searchAlertRegressionPct) {
      alerts.push({
        code: 'BENCHMARK_REGRESSION',
        severity: 'warning',
        at: now,
        message: `Prefix benchmark regression detected (${regressionPct}% vs regex baseline).`,
      });
    }
  }

  return alerts;
}
