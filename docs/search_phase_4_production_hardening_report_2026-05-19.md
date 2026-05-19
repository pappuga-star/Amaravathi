# Search Phase 4 Production Hardening Report (2026-05-19)

References:
- `docs/search_phase_3_performance_optimization_report_2026-05-19.md`
- `docs/search_ssot_100_percent_compliance_report_2026-05-19.md`
- `docs/repo-policy.md`

## 1. Files Created

Backend (`apps/api/src/search`):
- `redis-search-cache.ts`
- `search-metrics.ts`
- `search-profiler.ts`
- `search-rate-limit.ts`
- `search-health.ts`
- `search-admin.controller.ts`
- `search-admin.routes.ts`
- `search-index-audit.ts`
- `search-alerts.ts`
- `search-admin.types.ts`

Frontend (`apps/admin-web/src/search`):
- `useSearchHealth.ts`
- `useSearchMetrics.ts`
- `SearchHealthDashboard.tsx`
- `SearchMetricsPanel.tsx`
- `SearchBenchmarkPanel.tsx`
- `SearchAlertsPanel.tsx`
- `SearchAdminPage.tsx`

## 2. Files Modified (Key Integration)

Backend:
- `apps/api/src/search/search.cache.ts`
- `apps/api/src/search/search.types.ts`
- `apps/api/src/search/search.service.ts`
- `apps/api/src/search/global-search.service.ts`
- `apps/api/src/search/search.events.ts`
- `apps/api/src/search/index.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/routes/globalSearchRoutes.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/middleware/errorHandler.ts`

Frontend:
- `apps/admin-web/src/App.tsx`
- `apps/admin-web/src/components/Layout.tsx`
- `apps/admin-web/src/search/index.ts`

## 3. Redis Setup Instructions

Environment variables:
- `SEARCH_CACHE_PROVIDER=memory|redis`
- `REDIS_URL=redis://<host>:<port>`

Behavior:
- `search.cache.ts` now uses hybrid memory+redis behavior.
- If `SEARCH_CACHE_PROVIDER=redis` and Redis is reachable, redis is used as distributed backing cache.
- If Redis is unavailable, memory cache continues serving automatically.

Notes:
- Current adapter uses `redis-cli` runtime invocation and degrades gracefully when unavailable.

## 4. Metrics Definitions

Tracked metrics include:
- total searches
- cache hits / misses / hit ratio
- average response time
- p95 latency
- slow query count and rate
- invalidation count
- search errors
- top modules searched
- top sanitized search terms

Metrics source:
- `search-metrics.ts`
- `search-profiler.ts`

## 5. Alert Thresholds

Configurable thresholds (env-backed):
- `SEARCH_ALERT_MIN_HIT_RATIO_PCT` (default `70`)
- `SEARCH_ALERT_P95_LATENCY_MS` (default `150`)
- `SEARCH_ALERT_SLOW_QUERY_PCT` (default `1`)
- `SEARCH_ALERT_REGRESSION_PCT` (default `20`)

Alert conditions:
- low cache hit ratio
- high p95 latency
- high slow-query rate
- Redis unavailable (when configured)
- benchmark regression

## 6. Search Admin APIs (Admin-only)

Routes under `/api/search-admin`:
- `GET /health`
- `GET /metrics`
- `POST /clear-cache`
- `POST /index-audit`
- `POST /run-benchmark`
- `GET /alerts`

Security:
- protected by `requireAuth` + `permit('admin')`.

## 7. Dashboard Description

New admin page route:
- `/search-admin`

Displays:
- cache provider / redis status
- active search engine
- cache size and hit ratio
- p95 and average latency
- slow query and invalidation counts
- top modules/terms metrics panel
- alerts panel
- benchmark runner and results
- index audit trigger and raw result output

## 8. Rate Limiting and Profiling

Rate limiting middleware:
- `search-rate-limit.ts`
- applied to global search, list/search endpoints, autocomplete-like endpoints, and report search endpoint.
- returns HTTP `429` on limit breaches.

Slow query profiling:
- threshold via `SEARCH_SLOW_QUERY_MS` (default `500` ms)
- logs module, normalized query, duration, results, cache-hit flag, and engine marker.

## 9. Index Audit and Benchmark Usage

Index audit:
- call `POST /api/search-admin/index-audit`
- returns missing/duplicate normalized-key index insights and recommendations.

Benchmark:
- call `POST /api/search-admin/run-benchmark`
- payload supports `query` and `iterations`
- compares regex/prefix/atlas (with current environment behavior)

## 10. Production Deployment Checklist

1. Set env vars:
   - `SEARCH_ENGINE`
   - `SEARCH_CACHE_PROVIDER`
   - `REDIS_URL` (if redis)
   - `SEARCH_ENABLE_ATLAS_FALLBACK`
   - rate limit + alert thresholds
2. Deploy API with new search-admin routes.
3. Verify `/api/search-admin/health` as admin user.
4. Validate Redis connectivity status and fallback behavior.
5. Run index audit and apply recommended index migrations.
6. Run benchmark and capture baseline in staging.
7. Enable alert monitoring in operational runbooks.

## 11. Validation Results

Executed:
- `npm run typecheck` -> PASS
- `npm run lint` -> PASS with warnings only (no errors)
- `npm run build` -> PASS

## 12. Known Limitations

- Redis integration currently relies on `redis-cli`; for high-throughput production environments, a native Node Redis client is recommended.
- Metrics are process-local; multi-instance aggregation requires external telemetry backend.
- Index audit currently focuses on search-specific normalized index presence and duplicate signatures; it is not yet a full query-plan usage analyzer.
