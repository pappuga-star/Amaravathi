import { env } from '../config/env.js';
import { searchMetrics } from './search-metrics.js';

type ProfileEvent = {
  module: string;
  normalizedQuery: string;
  executionTimeMs: number;
  resultCount: number;
  cacheHit: boolean;
  engine: string;
};

const recentSlowQueries: ProfileEvent[] = [];

export function recordSearchProfile(event: ProfileEvent): void {
  const slow = searchMetrics.isSlow(event.executionTimeMs);
  searchMetrics.recordSearch({
    module: event.module,
    ms: event.executionTimeMs,
    term: event.normalizedQuery,
    slow,
  });

  if (slow) {
    recentSlowQueries.unshift(event);
    if (recentSlowQueries.length > 100) recentSlowQueries.pop();
    console.warn(
      `[search-slow] module=${event.module} engine=${event.engine} ms=${event.executionTimeMs.toFixed(2)} results=${event.resultCount} cacheHit=${event.cacheHit} q="${event.normalizedQuery}" threshold=${env.searchSlowQueryMs}`,
    );
  }
}

export function getRecentSlowQueries(): ProfileEvent[] {
  return recentSlowQueries;
}
