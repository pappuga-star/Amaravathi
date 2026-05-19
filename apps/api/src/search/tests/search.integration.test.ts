import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { globalSearchController } from '../../controllers/globalSearchController.js';
import { searchAdminController } from '../search-admin.controller.js';
import { globalSearchRateLimit } from '../search-rate-limit.js';
import { requireAuth, permit } from '../../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const { serviceSearch } = vi.hoisted(() => ({
  serviceSearch: vi.fn(async (q: string) => {
    if (q === 'royl') {
      return {
        customers: [],
        savedBlends: [],
        customerTeaBlends: [],
        purchaseBatches: [],
        generalItems: [],
        batchIngredients: [],
        teaPowderTypes: [],
        suppliers: [],
      };
    }
    return {
      customers: [{ _id: '1', type: 'customer', label: 'Royal', subtitle: 'x', route: '/customers/1' }],
      savedBlends: [],
      customerTeaBlends: [],
      purchaseBatches: [],
      generalItems: [],
      batchIngredients: [],
      teaPowderTypes: [],
      suppliers: [],
    };
  }),
}));

vi.mock('../../services/globalSearchService.js', () => ({ globalSearchService: { search: serviceSearch } }));
vi.mock('../search-analytics.js', () => ({
  getSearchQualityAnalytics: vi.fn(() => ({ popularTerms: ['royal'], noResultTerms: ['xyz'] })),
  trackSearchTerm: vi.fn(),
}));
vi.mock('../search-zero-results.js', () => ({ recoverFromZeroResults: vi.fn(() => ({ correctedQuery: 'royal', alternatives: ['premium'] })) }));
vi.mock('../search-suggestions.js', () => ({ buildSuggestions: vi.fn(() => [{ text: 'Royal', type: 'label' }]) }));
vi.mock('../search-personalization.js', () => ({ personalizeResults: vi.fn((_, items) => items), trackUserSearch: vi.fn() }));
vi.mock('../search-relevance.js', () => ({ applyBusinessRelevance: vi.fn((items) => items) }));
vi.mock('../search-health.js', () => ({ getSearchHealth: vi.fn(async () => ({ cacheProvider: 'memory', activeSearchEngine: 'prefix', redisConnected: false })) }));
vi.mock('../search-alerts.js', () => ({ getSearchAlerts: vi.fn(async () => []), setLatestBenchmark: vi.fn() }));
vi.mock('../search-index-audit.js', () => ({ runSearchIndexAudit: vi.fn(async () => ({ ok: true })) }));
vi.mock('../search-benchmark.js', () => ({ benchmarkSearchEngines: vi.fn(async () => [{ engine: 'prefix', warmMs: 10 }]) }));
vi.mock('../search-metrics.js', () => ({ searchMetrics: { getSnapshot: vi.fn(() => ({ cacheHitCount: 1 })) } }));

function mockRes() {
  const res: Partial<Response> & { statusCode?: number; body?: any } = {};
  res.statusCode = 200;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = vi.fn((body: any) => {
    res.body = body;
    return res as Response;
  });
  res.setHeader = vi.fn();
  return res as Response & { statusCode: number; body: any };
}

function mockReq(overrides: Partial<Request> = {}) {
  return {
    query: {},
    body: {},
    headers: {},
    header(name: string) {
      const key = name.toLowerCase();
      return (this.headers as Record<string, string>)[key] ?? (this.headers as Record<string, string>)[name];
    },
    ip: '127.0.0.1',
    ...overrides,
  } as Request;
}

describe('search integration handlers/middleware', () => {
  it('global-search returns typo recovery quality metadata', async () => {
    const req = mockReq({ query: { q: 'royl' }, user: { id: 'u1', role: 'admin', email: 'x@y.com' } as any });
    const res = mockRes();
    await globalSearchController.search(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quality.correctedQuery).toBe('royal');
  });

  it('global-search suggestions and analytics endpoints respond', async () => {
    const sReq = mockReq({ query: { q: 'roy' }, user: { id: 'u1', role: 'admin', email: 'x@y.com' } as any });
    const sRes = mockRes();
    await globalSearchController.suggestions(sReq, sRes);
    expect(sRes.statusCode).toBe(200);

    const aRes = mockRes();
    globalSearchController.analytics(mockReq(), aRes);
    expect(aRes.statusCode).toBe(200);
  });

  it('search-admin handlers work and auth/permit enforce access', async () => {
    const adminReq = mockReq({ user: { id: 'u1', role: 'admin', email: 'x@y.com' } as any, body: { query: 'royal', iterations: 2 } });
    const res1 = mockRes();
    await searchAdminController.health(adminReq, res1);
    expect(res1.statusCode).toBe(200);

    const res2 = mockRes();
    await searchAdminController.runBenchmark(adminReq, res2);
    expect(res2.statusCode).toBe(200);

    const noAuthReq = mockReq();
    const noAuthRes = mockRes();
    requireAuth(noAuthReq, noAuthRes, (() => {}) as any);
    expect(noAuthRes.statusCode).toBe(401);

    const forbidRes = mockRes();
    permit('admin')(mockReq({ user: { role: 'viewer' } as any }), forbidRes, (() => {}) as any);
    expect(forbidRes.statusCode).toBe(403);
  });

  it('rate limiter trips after threshold', () => {
    const limiter = globalSearchRateLimit();
    const req = mockReq({ user: { id: 'rate-user', role: 'admin', email: 'x@y.com' } as any });
    let limited = false;
    for (let i = 0; i < Number(env.searchGlobalRateLimitPerMinute) + 3; i += 1) {
      const res = mockRes();
      limiter(req, res, (() => {}) as any);
      if (res.statusCode === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });

  it('requireAuth accepts valid token', () => {
    const token = jwt.sign({ id: 'u1', role: 'admin', email: 'x@y.com' }, env.jwtSecret);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any });
    const res = mockRes();
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
