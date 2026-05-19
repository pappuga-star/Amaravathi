# Amaravathi Tea Project Audit Report
Date: 2026-05-19
Scope: Database connection, schemas, seed scripts, CRUD APIs, routing, validation, frontend API integration, update/delete flows, performance/security/dead code.

## 1) Database Connection Findings
- PASS: Single DB bootstrap path in runtime entrypoint (`connectDatabase()` called once in server startup).
  - File: `apps/api/src/server.ts`
- RISK: Seeding runs on every server start.
  - File: `apps/api/src/server.ts`
  - Impact: unexpected write load and startup mutation in production.
- PARTIAL: Fail-fast behavior exists for missing/failed DB connection.
  - File: `apps/api/src/config/db.ts`
- GAP: No retry/backoff strategy visible for transient connection failure.
  - File: `apps/api/src/config/db.ts`

## 2) Schema Findings
- PASS: Customer tea formula customer relationship uses `customerId: ObjectId`.
  - File: `apps/api/src/models/CustomerTeaFormula.ts`
- RISK: `GeneralItemsMaster` has `unique(itemName)` but soft-delete uses `deletedAt`; restoring/recreate flows can conflict because index is not partial.
  - File: `apps/api/src/models/GeneralItemsMaster.ts`
- RISK: Formula code generation uses `countDocuments` in pre-validate; race condition possible under concurrent creates.
  - File: `apps/api/src/models/CustomerTeaFormula.ts`
- NOTE: Legacy fields still present by design (`leafCategoryId`, `addons`, `finalPrice`, `marginPercent`) in formula schema.
  - File: `apps/api/src/models/CustomerTeaFormula.ts`

## 3) Seed Script Findings
- HIGH: Startup auto-seeding enabled unconditionally.
  - File: `apps/api/src/server.ts`
- RISK: Seed includes weak/default credentials in code.
  - File: `apps/api/src/utils/seed.ts`
- RISK: Seeded customer mobile values use `+91...` format, but shared validation expects strict 10 digits in API payload contracts.
  - Files: `apps/api/src/utils/seed.ts`, `packages/shared-types/src/index.ts`
- PARTIAL: Seeding is mostly idempotent (uses upsert/findOneAndUpdate).
  - File: `apps/api/src/utils/seed.ts`

## 4) CRUD API Findings
- PASS: Most list endpoints support pagination and use `lean()`.
- PASS: Customer delete dependency check now uses formula relation and soft-delete exclusion.
  - File: `apps/api/src/routes/index.ts`
- GAP: Generic CRUD controller delete path hard-deletes and lacks ObjectId format validation.
  - File: `apps/api/src/controllers/crudController.ts`
- GAP: ID format validation is inconsistent across endpoints (some return 404 from cast failures instead of explicit 400 invalid ID).
  - Files: multiple controllers/routes.
- NOTE: `GeneralItemsMaster` create has app-level duplicate check + DB unique index (good), but index/soft-delete mismatch remains.
  - File: `apps/api/src/controllers/generalItemsController.ts`

## 5) Frontend API Integration Findings
- PASS: Base URL is environment-driven with fallback.
  - File: `apps/admin-web/src/lib/api.ts`
- GAP: API client assumes JSON body for all responses and does not handle empty/non-JSON responses defensively.
  - File: `apps/admin-web/src/lib/api.ts`
- NOTE: Query usage is generally good with scoped keys; some very large page limits (`250`, `1000`) may increase payload/latency.

## 6) Validation Findings
- PASS: Shared Zod schemas exist and are used in many create/update flows.
- GAP: Some modules use direct Mongoose validators only; validation strictness differs by entry path.
- GAP: ObjectId format validation behavior is not uniform across all routes.

## 7) Performance Findings
- PASS: Frequent use of `lean()` in read endpoints.
- RISK: Global search and some list endpoints use regex scans on non-prefix/non-index-friendly patterns; can degrade with scale.
  - Files: `apps/api/src/services/globalSearchService.ts`, others.
- RISK: In-memory caches (`Map`) have TTL but no size cap/eviction policy.
  - Files: `apps/api/src/services/globalSearchService.ts`, `apps/api/src/controllers/generalItemsController.ts`

## 8) Security Findings
- PASS: Auth middleware and role-based permit checks are present.
  - File: `apps/api/src/middleware/auth.ts`
- HIGH: Hardcoded seed credentials in repository.
  - File: `apps/api/src/utils/seed.ts`
- RISK: Console logging of full incoming formula payload in controller.
  - File: `apps/api/src/controllers/customerTeaFormulaController.ts`

## 9) Dead Code Findings
- RISK: `apps/api/dist/` contains many stale compiled artifacts/models/controllers not present in current source tree; potential confusion and deployment risk if build/source paths are mixed.
- RISK: `apps/api/src/controllers/searchController.ts` appears unused (global search now routed via `globalSearchRoutes` + `globalSearchController`).

## 10) Naming Inconsistencies
- `deletedAt` is used for soft delete across many modules; generic CRUD still hard-deletes.
- Legacy naming coexistence (`lineItems` vs legacy `items` handling in purchase batch schema) is intentionally present but increases complexity.

## 11) Recommended Fixes (Priority Order)
1. Gate startup seeding behind explicit env flag (e.g., `SEED_ON_STARTUP=true` in local only).
2. Remove hardcoded seed credentials; use env-driven bootstrap and forced rotation flow.
3. Add global ObjectId param validation middleware for `:id` routes to standardize `400 Invalid ID`.
4. Convert `GeneralItemsMaster` unique index to partial unique index on active (non-deleted) rows.
5. Remove/disable verbose payload logs in formula create controller.
6. Replace formula code generation counter strategy with collision-safe sequence strategy (or retry on duplicate key).
7. Define bounded cache policy for in-memory caches.
8. Remove or quarantine stale `apps/api/dist` from source control/runtime path.
9. Prune unused `searchController.ts` if confirmed unused.

## 12) Files Modified During This Audit
- `docs/full_stack_audit_report_2026-05-19.md` (new report)

## 13) Verification Checklist
- [ ] Server starts with DB connection once and no auto-seed in production.
- [ ] Seed rerun does not create duplicates and does not use hardcoded creds.
- [ ] All `:id` routes return `400` on malformed ObjectId.
- [ ] Soft-delete modules use compatible partial unique indexes.
- [ ] Formula create/update/delete and customer delete scenarios pass.
- [ ] Frontend API errors are surfaced consistently from backend messages.
- [ ] Lint errors (not just warnings) are cleared in all workspaces.
- [ ] Stale build artifacts cannot be accidentally deployed.

## Runtime/Database-Live Checks Not Executed
- Mongo collection integrity/orphan checks requiring live DB credentials and shell session were not executed in this run.

## 14) Customer Tea Formula Benchmark Harness (Added)
- Script: `apps/api/src/utils/benchmarkCustomerTeaFormulaPerformance.ts`
- NPM command: `npm --workspace @amaravathi/api run perf:customer-tea-formulas`
- Purpose: repeatable p50/p95 latency + payload-size measurement for:
  - `GET /api/customer-tea-formulas?q=&status=all&limit=100`
  - `GET /api/customer-tea-formulas/:id?includeHistory=false`
  - `POST /api/customer-tea-formulas` (when create payload file is provided)

### Required/Optional Environment Variables
- `API_BASE_URL` (default `http://localhost:4000/api`)
- `BENCHMARK_AUTH_TOKEN` (optional bearer token if auth is enabled)
- `BENCHMARK_RUNS` (default `20`)
- `TEA_FORMULA_LIST_QUERY` (default `/customer-tea-formulas?q=&status=all&limit=100`)
- `TEA_FORMULA_DETAIL_ID` (optional; auto-derives first list row if omitted)
- `TEA_FORMULA_CREATE_PAYLOAD_FILE` (optional JSON file path for POST benchmark)

### Example Run
```bash
export API_BASE_URL="http://localhost:4000/api"
export BENCHMARK_AUTH_TOKEN="<token-if-required>"
export BENCHMARK_RUNS="25"
export TEA_FORMULA_CREATE_PAYLOAD_FILE="/absolute/path/create-formula-payload.json"
npm --workspace @amaravathi/api run perf:customer-tea-formulas
```

### Benchmark Run (Executed: 2026-05-19)
Run context:
- Command: `npm --workspace @amaravathi/api run perf:customer-tea-formulas`
- Base URL: `http://localhost:4000/api`
- Runs: `20`
- Auth token: not provided (`BENCHMARK_AUTH_TOKEN` unset)

Observed behavior:
- List endpoint returned `401` for all runs, so this result only reflects unauthenticated rejection latency.
- Detail benchmark skipped because no list item could be resolved from unauthorized response.
- Create benchmark skipped because `TEA_FORMULA_CREATE_PAYLOAD_FILE` was not provided.

| Endpoint | Method | Runs | Status Codes | p50 (ms) | p95 (ms) | Avg (ms) | Avg Payload (bytes) |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| `/customer-tea-formulas?q=&status=all&limit=100` | GET | 20 | 401x20 | 0.71 | 2.18 | 3.42 | 53 |
| `/customer-tea-formulas/:id?includeHistory=false` | GET | skipped | n/a | n/a | n/a | n/a | n/a |
| `/customer-tea-formulas` | POST | skipped | n/a | n/a | n/a | n/a | n/a |

### Next Run Required For Final Performance Evidence
Provide these environment variables, then rerun to capture true endpoint performance:

```bash
export API_BASE_URL="http://localhost:4000/api"
export BENCHMARK_AUTH_TOKEN="<valid-jwt>"
export BENCHMARK_RUNS="25"
export TEA_FORMULA_LIST_QUERY="/customer-tea-formulas?q=&status=all&limit=100"
export TEA_FORMULA_CREATE_PAYLOAD_FILE="/absolute/path/create-formula-payload.json"
npm --workspace @amaravathi/api run perf:customer-tea-formulas
```
