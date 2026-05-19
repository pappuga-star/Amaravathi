# Amaravathi Performance Forensic Audit
Date: 2026-05-19

## Scope
- API timing decomposition (total/auth/permission/db/serialization)
- Mongoose query timing + debug logs
- Mongo query-plan validation (`IXSCAN` vs `COLLSCAN`)
- Connection pool wait detection
- Frontend parallel API load behavior
- Host resource snapshot

## Instrumentation Added
- Request profiler middleware: `apps/api/src/middleware/requestProfiler.ts`
- Async request context for DB timing: `apps/api/src/utils/requestPerformanceContext.ts`
- Auth/permission middleware phase timing: `apps/api/src/middleware/auth.ts`
- Mongoose query timing + pool checkout wait capture: `apps/api/src/config/db.ts`
- Atlas-safe forensic script (`explain`, profiler fallback): `apps/api/src/utils/forensicApiPerformanceAudit.ts`
- API package command: `npm --workspace @amaravathi/api run perf:forensic-api`
- Frontend API profiling toggle (`VITE_API_PROFILING=true`): `apps/admin-web/src/lib/api.ts`

## Measured Evidence (Before Fixes)
From local probe logs with instrumentation:
- `GET /api/auth/me`: ~1080ms total
  - DB query ~1068ms
  - Pool wait ~984ms
- `GET /api/users?limit=1`: ~2138ms total
  - `users.find` ~759ms
  - `users.countDocuments` ~2135ms (parallel)
- `GET /api/users?limit=1` (conditional): 304 in ~274ms
  - Still executed DB `find + countDocuments`

## Query Plan Audit (`perf:forensic-api`)
- `GET /users?limit=1`: `SORT -> COLLSCAN`
- `GET /customers?limit=1`: `SORT -> COLLSCAN`
- `GET /tea-powder-types?limit=1`: `SORT -> COLLSCAN`
- `GET /auth/me` probe shape: `PROJECTION_SIMPLE -> COLLSCAN`

## Root Cause (Largest Bottleneck)
Primary bottleneck is **database round-trip latency plus expensive list-count pattern**:
- Every `limit=1` list call executes two DB operations (`find` + `countDocuments`), each incurring Atlas RTT.
- Conditional 304 does not bypass route handler work; DB operations still execute before response freshness check.
- Cold request spikes were worsened by pool checkout wait and startup index activity.

## Fixes Implemented
1. DB connection/pool hardening in `apps/api/src/config/db.ts`:
   - Added `minPoolSize`, `maxPoolSize`, `maxIdleTimeMS`, `serverSelectionTimeoutMS`.
   - Added startup ping warmup to reduce first-request checkout delay.
   - Disabled `autoIndex` by default via env (`MONGOOSE_AUTO_INDEX=false`).
2. List counting optimization in `apps/api/src/controllers/crudController.ts`:
   - Uses `estimatedDocumentCount()` when no filter is present.
3. Frontend duplicate auth-fetch reduction:
   - `Layout` now reads cached `['me']` query instead of refetching `/auth/me`.
4. Permanent profiling controls:
   - `PERF_PROFILING_ENABLED`, `MONGOOSE_DEBUG_ENABLED` env flags.

## Measured Evidence (After Fixes)
Same endpoint probes:
- `GET /api/auth/me`: ~259ms
- `GET /api/users?limit=1`: ~251ms
- `GET /api/customers?limit=1`: ~257ms
- `GET /api/tea-powder-types?limit=1`: ~257ms
- `GET /api/users?limit=1` with `If-None-Match`: 304 ~255ms

Per-phase profiler confirms:
- auth/permission/serialization are low (sub-2ms typical)
- DB query time dominates (~240–255ms per query)
- pool wait now near zero (~0.03–0.13ms)

## Constraints Blocking 50ms/100ms Targets
Given current Atlas topology and measured RTT (~240–255ms/query), these targets are not achievable without architecture changes:
- `304 < 50ms`
- `limit=1 < 100ms`

To hit those targets, API must avoid DB trips for these reads (server cache/Redis, denormalized counters, or regional DB placement near API host).

## Host Resource Snapshot
- CPU: Apple M2, 8 cores
- RAM: 8 GB
- Top CPU consumers were editor/browser processes, not API
- Docker not available in this environment (`docker` command missing)

## Commands Used
- `npm --workspace @amaravathi/api run perf:forensic-api`
- Live endpoint probes with authenticated curl + conditional `If-None-Match`

