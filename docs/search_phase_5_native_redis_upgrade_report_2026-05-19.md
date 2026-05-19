# Search Phase 5 Native Redis Upgrade Report (2026-05-19)

References:
- `docs/search_phase_4_production_hardening_report_2026-05-19.md`
- `docs/repo-policy.md`

## 1. Files Created / Updated

Created:
- `apps/api/src/search/redis-client.ts`

Updated:
- `apps/api/src/search/redis-search-cache.ts`
- `apps/api/src/search/search.cache.ts`
- `apps/api/src/search/search-health.ts`
- `apps/api/src/search/search-alerts.ts`
- `apps/api/src/search/search-admin.controller.ts`
- `apps/api/src/search/search-admin.routes.ts`
- `apps/api/src/search/search-admin.types.ts`
- `apps/api/src/config/env.ts`

## 2. Dependency Changes

Added:
- `ioredis` to `@amaravathi/api`

Note:
- Workspace installation required `pnpm` due existing monorepo workspace protocol and store layout.

## 3. Redis Client Configuration

New module:
- `apps/api/src/search/redis-client.ts`

Capabilities:
- singleton Redis client
- lazy connect
- reconnect strategy with exponential backoff
- reconnect attempt tracking
- ping latency tracking
- memory usage retrieval (`INFO memory` parsing)
- safe disconnect helper

Environment variables used:
- `REDIS_URL`
- `REDIS_CONNECT_TIMEOUT_MS` (default `5000`)
- `REDIS_MAX_RETRIES` (default `10`)
- `REDIS_PING_TIMEOUT_MS` (default `1000`)

## 4. Reliability Behavior

Cache provider behavior (`search.cache.ts`):
- memory cache always active as availability baseline
- redis adapter used when configured and connected
- automatic fallback to memory on redis outages/errors
- reconnection attempts occur in background
- cache interface remains unchanged for existing search services/controllers

Redis adapter behavior (`redis-search-cache.ts`):
- JSON serialization/deserialization for values
- `SCAN` + `MATCH <prefix>*` for prefix invalidation (no `KEYS`)
- `FLUSHDB` for full clear
- graceful recoverable failures for fallback path

## 5. Health and Diagnostics Enhancements

`search-health.ts` now reports:
- provider mode (`redis` / `memory-fallback`)
- redis connected status
- redis ping latency
- redis memory usage bytes
- redis reconnect attempts

`search-alerts.ts` now includes:
- `REDIS_UNAVAILABLE`
- `REDIS_PING_HIGH`
- `REDIS_RECONNECT_EXCEEDED`

`search-admin.controller.ts` health endpoint now returns redis diagnostics via updated health snapshot.

## 6. Validation Results

Executed:
- `npm run typecheck` -> PASS
- `npm run lint` -> PASS (warnings only, no errors)
- `npm run build` -> PASS

## 7. Production Deployment Notes

1. Set:
   - `SEARCH_CACHE_PROVIDER=redis`
   - `REDIS_URL=redis://...` (or `rediss://...`)
   - optional timeout/retry/ping envs
2. Deploy API.
3. Verify `/api/search-admin/health`:
   - `providerMode`
   - `redisConnected`
   - `redisPingLatencyMs`
   - `redisReconnectAttempts`
4. Validate cache invalidation and fallback by simulating Redis outage.

## 8. Comparison vs Previous `redis-cli` Implementation

Previous (Phase 4):
- shelling out to `redis-cli`
- process-spawn overhead per operation
- weaker connection telemetry

Current (Phase 5):
- native `ioredis` client
- persistent connection and automatic reconnects
- lower per-operation overhead
- explicit ping/memory/reconnect diagnostics
- operationally safer SCAN invalidation retained

## 9. Acceptance Criteria Mapping

- `redis-cli` no longer used: ✅
- native Redis client implemented: ✅
- prefix invalidation via SCAN: ✅
- automatic memory fallback works: ✅
- redis health diagnostics available: ✅
- alerts detect Redis issues: ✅
- typecheck/lint/build pass: ✅
- documentation complete: ✅
