import { env } from '../config/env.js';
import type { SearchMetricsSnapshot } from './search-admin.types.js';

type TimingEvent = { module: string; ms: number; term?: string; slow: boolean };

const MAX_TIMINGS = 2000;

class SearchMetricsStore {
  private totalSearches = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private searchErrors = 0;
  private invalidationCount = 0;
  private slowQueries = 0;
  private timings: number[] = [];
  private moduleCounts = new Map<string, number>();
  private termCounts = new Map<string, number>();

  recordSearch(event: TimingEvent): void {
    this.totalSearches += 1;
    this.timings.push(event.ms);
    if (this.timings.length > MAX_TIMINGS) this.timings.shift();
    this.moduleCounts.set(event.module, (this.moduleCounts.get(event.module) ?? 0) + 1);
    if (event.term) {
      this.termCounts.set(event.term, (this.termCounts.get(event.term) ?? 0) + 1);
    }
    if (event.slow) this.slowQueries += 1;
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  recordInvalidation(): void {
    this.invalidationCount += 1;
  }

  recordError(): void {
    this.searchErrors += 1;
  }

  getSnapshot(): SearchMetricsSnapshot {
    const totalCacheLookups = this.cacheHits + this.cacheMisses;
    const cacheHitRatioPct = totalCacheLookups
      ? Number(((this.cacheHits / totalCacheLookups) * 100).toFixed(2))
      : 0;

    const sum = this.timings.reduce((acc, v) => acc + v, 0);
    const averageResponseTimeMs = this.timings.length
      ? Number((sum / this.timings.length).toFixed(2))
      : 0;

    const sorted = [...this.timings].sort((a, b) => a - b);
    const p95Index = sorted.length ? Math.floor(sorted.length * 0.95) - 1 : -1;
    const p95Value = p95Index >= 0 ? sorted[Math.max(0, p95Index)] : 0;
    const p95LatencyMs = Number((p95Value ?? 0).toFixed(2));

    const topModules = [...this.moduleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([module, count]) => ({ module, count }));

    const topSanitizedTerms = [...this.termCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    return {
      totalSearches: this.totalSearches,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRatioPct,
      averageResponseTimeMs,
      p95LatencyMs,
      slowQueries: this.slowQueries,
      invalidationCount: this.invalidationCount,
      searchErrors: this.searchErrors,
      topModules,
      topSanitizedTerms,
    };
  }

  getSlowQueryRatePct(): number {
    if (!this.totalSearches) return 0;
    return Number(((this.slowQueries / this.totalSearches) * 100).toFixed(2));
  }

  isSlow(ms: number): boolean {
    return ms >= env.searchSlowQueryMs;
  }
}

export const searchMetrics = new SearchMetricsStore();
