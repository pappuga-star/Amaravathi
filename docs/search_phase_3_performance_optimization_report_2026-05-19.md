# Search Phase 3 Performance Optimization Report (2026-05-19)

References:
- `docs/search_ssot_100_percent_compliance_report_2026-05-19.md`
- `docs/repo-policy.md`

## 1) Files Created

Search engine architecture:
- `apps/api/src/search/search-engine.ts`
- `apps/api/src/search/regex-search-engine.ts`
- `apps/api/src/search/normalized-prefix-search-engine.ts`
- `apps/api/src/search/atlas-search-engine.ts`
- `apps/api/src/search/search-engine-factory.ts`
- `apps/api/src/search/search-ranking.ts`
- `apps/api/src/search/search-benchmark.ts`
- `apps/api/src/search/search-index-migrations.ts`

## 2) Files Updated

Core integration:
- `apps/api/src/search/search.service.ts`
- `apps/api/src/search/global-search.service.ts`
- `apps/api/src/search/search.utils.ts`
- `apps/api/src/search/index.ts`
- `apps/api/src/config/env.ts`

Controller integration:
- `apps/api/src/controllers/crudController.ts`
- `apps/api/src/controllers/masterController.ts`
- `apps/api/src/controllers/addPurchaseBatchController.ts`
- `apps/api/src/controllers/generalItemsController.ts`

Model normalization/index upgrades:
- `apps/api/src/models/AddPurchaseBatch.ts`
- `apps/api/src/models/CustomerTeaFormula.ts`
- `apps/api/src/models/GeneralItemsMaster.ts`
- `apps/api/src/models/GeneralItemPurchase.ts`

## 3) Model and Normalized Key Upgrades

Added and maintained normalized key fields in schema hooks:
- `AddPurchaseBatch.batchCodeKey`
- `CustomerTeaFormula.formulaCodeKey`
- `GeneralItemsMaster.itemNameKey`
- `GeneralItemPurchase.supplierNameKey`

Existing normalized fields retained and used:
- `Customer.nameKey`
- `Seller.nameKey`
- `TeaPowderType.nameKey`

Normalization rules are centralized in `normalizeSearchKey()`:
- trim
- lowercase
- collapse spaces
- remove punctuation/symbol noise

## 4) Search Engine Abstraction

Implemented common interface and interchangeable engines:
- `RegexSearchEngine`: contains regex strategy.
- `NormalizedPrefixSearchEngine`: prefix-first strategy on normalized key fields (with contains fallback per field).
- `AtlasSearchEngine`: Atlas `$search` integration with optional fallback.

Factory selection:
- `SEARCH_ENGINE=regex|prefix|atlas`
- default: `prefix`

Atlas fallback behavior:
- `SEARCH_ENABLE_ATLAS_FALLBACK=true` enables graceful fallback to regex strategy when Atlas Search stage/index is unavailable.

## 5) Ranking and Relevance

Added weighted ranking utility in `search-ranking.ts` and applied it in:
- `search.service.ts` (module list search when search fields are provided)
- `global-search.service.ts` (grouped global results)

Weight model implemented:
- exact code > prefix code > exact name > prefix name > contains name > text contains.

## 6) Search Service Integration

`runListSearch()` now supports engine-driven query planning via:
- `searchFields`
- `searchMode` (`prefix`/`contains`)
- optional ranking (enabled by default when search fields exist)

Backward compatibility preserved:
- existing `buildFilter` path still supported.
- API contracts unchanged (`q/page/limit/sortBy/sortOrder`, paginated response shape).

## 7) Global Search Integration

`global-search.service.ts` now:
- uses the engine factory for collection search plans/execution
- applies weighted ranking per result group
- keeps permissions filtering intact
- keeps grouped response contract intact
- keeps cache behavior intact

## 8) Index Migration Support

Added `ensureSearchIndexes()` in `search-index-migrations.ts` to create normalized search indexes for upgraded key fields.

## 9) Benchmark Tooling

Added benchmark harness:
- `apps/api/src/search/search-benchmark.ts`

Compares engines:
- regex
- prefix
- atlas

Metrics produced:
- cold latency (ms)
- warm latency (avg ms)
- throughput (ops/sec)

## 10) Engine Comparison Summary (Implementation-Level)

- Regex engine: broad matching, highest scan risk on contains patterns.
- Prefix engine: optimized for indexed prefix lookups on normalized keys, preferred default for predictable latency.
- Atlas engine: best relevance/scoring potential and scalable full-text behavior when Atlas Search is provisioned.

Recommended default engine:
- `SEARCH_ENGINE=prefix`

Recommended production setting when Atlas index is ready:
- `SEARCH_ENGINE=atlas`
- `SEARCH_ENABLE_ATLAS_FALLBACK=true`

## 11) Benchmark Execution Notes

- Benchmark tooling is implemented and compilable.
- Runtime benchmark numbers depend on environment-specific dataset size, index build state, and Atlas availability.
- Execute benchmark in staging/prod-like environment after index migration rollout to obtain final comparison numbers for your dataset.

## 12) Deployment Notes

1. Deploy code with `SEARCH_ENGINE=prefix` first.
2. Run index migration (`ensureSearchIndexes()`) and confirm index build completion.
3. Validate module/global query latency and query plans.
4. Provision Atlas Search index (if used).
5. Switch to `SEARCH_ENGINE=atlas` with fallback enabled.
6. Monitor latency, cache hit rates, and explain plans.

## 13) Validation Results

Executed in workspace:
- `npm run typecheck` -> PASS
- `npm run lint` -> PASS (warnings only, no errors)
- `npm run build` -> PASS

## 14) Acceptance Criteria Status

- Search engine abstraction implemented: ✅
- Prefix search with normalized indexed fields: ✅
- Atlas Search integration with fallback: ✅
- Ranking applied consistently in search services: ✅
- Benchmark tooling added for engine comparison: ✅
- Existing API contracts unchanged: ✅
- Typecheck/lint/build pass: ✅
- Documentation complete: ✅
