# Quality Test and Knip Audit (2026-05-19)

## 1. Root Causes

1. `npm test` failure root cause:
- `apps/admin-web` used `vitest run` without a dedicated Vitest include/exclude boundary.
- Playwright spec file `apps/admin-web/tests/ui-layout.spec.ts` matched Vitest's default `*.spec.ts` discovery.
- Vitest attempted to execute Playwright's `test.describe`, causing runtime failure.

2. `npm run quality:pr` failure root cause:
- `knip` reported intentionally retained operational files and stale barrel/duplicate TS script entries.
- Some exports were defined but not consumed, causing unnecessary `knip` noise.

## 2. Files Changed

### Test runner isolation
- `apps/admin-web/vitest.config.ts` (added)
- `apps/admin-web/playwright.config.ts` (updated)
- `apps/admin-web/package.json` (updated scripts)
- `package.json` (updated root scripts and quality gate chain)
- `apps/admin-web/tests/ui-layout.spec.ts` -> `apps/admin-web/tests/e2e/ui-layout.e2e.spec.ts` (moved/renamed)
- `tests/e2e/search/search.e2e.spec.ts` -> `apps/admin-web/tests/e2e/search.e2e.spec.ts` (moved)
- `apps/admin-web/tests/unit/.gitkeep` (added)
- `apps/admin-web/tests/integration/.gitkeep` (added)

### Knip cleanup/hardening
- `knip.json` (expanded intentional ignores for operational CLI utilities)
- Removed unused files:
  - `apps/admin-web/src/search/index.ts`
  - `apps/api/src/search/index.ts`
  - `apps/api/src/search/search-index-migrations.ts`
  - `scripts/search-benchmark-regression-check.ts`
  - `scripts/search-release-check.ts`
  - `scripts/verify-search-ssot.ts`
- Reduced unused exports:
  - `apps/admin-web/src/search/search.constants.ts`
  - `apps/admin-web/src/search/search.types.ts`
  - `apps/admin-web/src/utils/sticky.ts`
  - `apps/api/src/search/search.constants.ts`
  - `apps/api/src/search/search-ranking.ts`
  - `apps/api/src/search/global-search.service.ts`
  - `apps/api/src/services/globalSearchService.ts`
  - `apps/api/src/search/search-engine.ts`
  - `apps/api/src/search/search-quality.types.ts`
  - `apps/api/src/controllers/globalSearchController.ts`
  - `apps/api/src/search/search-health.ts`
  - `apps/api/src/server.ts`

### Policy updates
- `docs/repo-policy.md` (test-runner isolation and dead-code governance rules)

## 3. Test Structure Decisions

Standardized under `apps/admin-web/tests`:

- `tests/unit`: Vitest unit tests
- `tests/integration`: Vitest integration tests
- `tests/e2e`: Playwright E2E tests only

Naming:
- Unit/integration: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
- E2E: `*.e2e.spec.ts`

Vitest boundaries (`apps/admin-web/vitest.config.ts`):
- include:
  - `src/**/*.{test,spec}.{ts,tsx}`
  - `tests/unit/**/*.{test,spec}.{ts,tsx}`
  - `tests/integration/**/*.{test,spec}.{ts,tsx}`
- exclude:
  - `tests/e2e/**`
  - `**/*.e2e.spec.*`
  - `node_modules`, `dist`, `build`

Playwright boundaries (`apps/admin-web/playwright.config.ts`):
- `testDir: ./tests/e2e`
- `testMatch: **/*.e2e.spec.ts`

## 4. Knip Findings and Resolutions

### Resolved by deletion/refactor
- Removed stale barrel files and duplicate TS script variants.
- Removed/reduced unused exports where they were not needed.
- Wired runtime usage to keep useful exports live (e.g., profiler data usage in search health, redis disconnect on shutdown).

### Intentional ignores (documented in `knip.json`)
- Operational CLI/audit utilities intended for explicit script execution:
  - `apps/api/src/utils/migratePurchaseBatchQuantity.ts`
  - `apps/api/src/utils/auditPurchaseBatchLineItemIds.ts`
  - `apps/api/src/utils/auditPurchaseBatchUpdatePerformance.ts`
  - `apps/api/src/utils/benchmarkCustomerTeaFormulaPerformance.ts`
  - `apps/api/src/utils/boundedTtlCache.ts`
  - `apps/api/src/utils/bulkInsertTeaPowderTypes.ts`
  - `apps/api/src/utils/forensicApiPerformanceAudit.ts`
  - `apps/api/src/utils/repairPurchaseBatchIndexes.ts`

Justification:
- These are operational diagnostics/maintenance entry points used on-demand and invoked by package scripts or manual runbooks, not imported by runtime modules.

## 5. Validation Results

Passed:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run dead-code:ci` (`knip`)
- `npm run quality:pr`

Environment-limited:
- `npm run test:e2e` failed in this sandbox due Playwright/Chromium launch permission constraints (`bootstrap_check_in ... Permission denied`), not due test discovery overlap.
- Config-level isolation is verified by:
  - Vitest pass without executing Playwright files
  - Playwright discovering only `tests/e2e/**/*.e2e.spec.ts`

## 6. Remaining Optional Improvements

1. Reduce non-blocking lint warnings (`any`, hook dependencies) incrementally.
2. Add a CI lane to run Playwright in a browser-capable environment.
3. Optionally migrate operational utility scripts into a dedicated `apps/api/src/ops/` namespace for clearer knip scoping.
