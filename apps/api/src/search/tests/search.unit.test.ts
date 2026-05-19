import { describe, expect, it, vi, beforeEach } from 'vitest';
import { validateSearchQuery, SearchValidationError } from '../search.validators.js';
import {
  buildContainsRegex,
  buildPagination,
  buildPrefixRegex,
  buildSearchCacheKey,
  clampLimit,
  normalizeQuery,
  normalizeSearchKey,
} from '../search.utils.js';
import { rankSearchResults } from '../search-ranking.js';
import { expandSynonyms } from '../search-synonyms.js';
import { findClosestTerm, fuzzyThreshold, levenshtein } from '../search-fuzzy.js';
import { normalizeLanguageTerm } from '../search-language.js';
import { recoverFromZeroResults } from '../search-zero-results.js';
import { getSearchAlerts, setLatestBenchmark } from '../search-alerts.js';
import { createSearchEngine, getSearchEngine, resetSearchEngineForTests } from '../search-engine-factory.js';
import { env } from '../../config/env.js';
import { searchCache } from '../search.cache.js';

vi.mock('../search-analytics.js', () => ({
  getPopularTerms: vi.fn(() => ['royal', 'premium', 'supplier', 'ctf001']),
  trackCorrectedQuery: vi.fn(),
}));

vi.mock('../search-health.js', () => ({
  getSearchHealth: vi.fn(async () => ({
    cacheHitRatioPct: 10,
    p95LatencyMs: 999,
    redisConnected: false,
    redisPingLatencyMs: 999,
    redisReconnectAttempts: 999,
  })),
}));

vi.mock('../search-metrics.js', () => ({
  searchMetrics: {
    getSlowQueryRatePct: vi.fn(() => 90),
    recordCacheHit: vi.fn(),
    recordCacheMiss: vi.fn(),
  },
}));

describe('search validators/utils', () => {
  it('validates normalized query and pagination', () => {
    const out = validateSearchQuery({ q: '  Tea  powder ', page: '2', limit: '5' as unknown as number });
    expect(out.normalizedQuery).toBe('Tea powder');
    expect(out.page).toBe(2);
    expect(out.limit).toBe(5);
  });

  it('rejects too short query', () => {
    expect(() => validateSearchQuery({ q: 'a' })).toThrow(SearchValidationError);
  });

  it('normalizes keys and regexes', () => {
    expect(normalizeQuery('  a   b ')).toBe('a b');
    expect(normalizeSearchKey('Ctf-001!')).toBe('ctf001');
    expect(buildContainsRegex('roy').test('Royal')).toBe(true);
    expect(buildPrefixRegex('roy').test('Royal')).toBe(true);
    expect(clampLimit(10_000)).toBeGreaterThan(0);
    expect(buildPagination('2', '10')).toEqual({ page: 2, limit: 10, skip: 10 });
    expect(buildSearchCacheKey('x', { b: 2, a: 1 })).toBe('x::a:1|b:2');
  });
});

describe('search ranking/synonyms/fuzzy/language/zero', () => {
  it('ranks code exact above contains', () => {
    const docs = [{ code: 'ctf001', name: 'Royal' }, { code: 'ctf777', name: 'ctf001 mix' }];
    const ranked = rankSearchResults(docs, 'ctf001', [
      { field: 'code', category: 'code' },
      { field: 'name', category: 'name' },
    ]);
    expect(ranked[0]?.code).toBe('ctf001');
  });

  it('expands synonyms bidirectionally', () => {
    const out = expandSynonyms('supplier');
    expect(out).toContain('seller');
  });

  it('does fuzzy matching and threshold logic', () => {
    expect(levenshtein('royl', 'royal')).toBeGreaterThanOrEqual(1);
    expect(fuzzyThreshold('abcd')).toBe(1);
    expect(fuzzyThreshold('abcdef')).toBe(2);
    expect(findClosestTerm('premim', ['premium', 'batch'])).toBe('premium');
  });

  it('normalizes language and zero result recovery', () => {
    expect(normalizeLanguageTerm('Prémium#  Tea')).toBe('premium tea');
    const recovered = recoverFromZeroResults('premim');
    expect(recovered.correctedQuery).toBe('premium');
    expect(recovered.alternatives.length).toBeGreaterThan(0);
  });
});

describe('search cache', () => {
  it('sets/gets values and clears by prefix', () => {
    searchCache.clearAll();
    searchCache.set('search::a', { ok: true });
    expect(searchCache.get<{ ok: boolean }>('search::a')?.ok).toBe(true);
    searchCache.clearByPrefix('search::');
    expect(searchCache.get('search::a')).toBeNull();
  });
});

describe('search engine factory', () => {
  beforeEach(() => resetSearchEngineForTests());

  it('creates and caches engine instance', () => {
    const first = getSearchEngine();
    const second = getSearchEngine();
    expect(first).toBe(second);
    expect(createSearchEngine()).toBeDefined();
    expect(['atlas', 'prefix', 'regex']).toContain(env.searchEngine);
  });
});

describe('search alerts', () => {
  it('raises alerts for unhealthy system and regression', async () => {
    setLatestBenchmark([
      { engine: 'regex', warmMs: 100 },
      { engine: 'prefix', warmMs: 200 },
    ]);
    const alerts = await getSearchAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some((a) => a.code === 'BENCHMARK_REGRESSION')).toBe(true);
  });
});
