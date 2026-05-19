# Search & Global Search SSOT Architecture Audit (2026-05-19)

Reference baseline reviewed: `docs/repo-policy.md` (SSOT + anti-duplication).

## 1) Search Architecture Inventory

| Module | UI Component/Page | Hook/State | API | Controller/Service | Query Pattern | Index Coverage | Cache |
|---|---|---|---|---|---|---|---|
| Tea Powder Types | `Modules.tsx` (`TeaPowderTypesPage`) | `useDebounce(300)` + React Query | `GET /tea-powder-types?q&page&limit` | `crudController.list` | `$or` regex over `name` | `name`, `active` present | React Query (default, no per-query staleTime) |
| Sellers | `Modules.tsx` (`SellersPage`) | `useDebounce(300)` | `GET /sellers?q&page&limit` | `crudController.list` | `$or` regex over `name/contactPerson/phone/email` | `name`, `active` only | React Query default |
| Customers | `Modules.tsx` (`CustomersPage`) | `useDebounce(300)` | `GET /customers?q&page&limit` | `crudController.list` | `$or` regex over `name/mobileNumber` | `name`, `mobileNumber`, `deletedAt+active`, `nameKey` | React Query default |
| Purchase Batches | `AddPurchaseBatchPage.tsx` | `useDebounce(300)` | `GET /add-purchase-batch?q` | `listAddPurchaseBatches` | `$or` regex over `batchCode/sellerName/billNumber/lineItems.teaPowderTypeName` + optional date | indexes on `purchaseDate`, `sellerName`, `billNumber`, `batchCode`, `lineItems.teaPowderTypeName` | React Query default |
| Purchase Batch quick search | N/A | N/A | `GET /add-purchase-batch/search?q` | `searchAddPurchaseBatches` | same `$or`, limit 25 | same as above | none |
| Customer Tea Formulas (saved list) | `SavedFormulasPage.tsx` | `useDebounce(300)` | `GET /customer-tea-formulas?q&status&limit&customerId` | `customerTeaFormulasController.list` | regex on `formulaCode` + separate `Customer` lookup by name | formula has no `formulaCode` index; has `customerId/status/deletedAt/createdAt` | React Query default |
| Customer formulas edit flow | `CustomerFormulasPage.tsx` | local lists | `GET /customers?limit=100`, `GET /add-purchase-batch?limit=100` | `crudController`, `listAddPurchaseBatches` | no query in defaults | indexed but large limit | React Query default |
| General Items purchase register | `GeneralItemsPage.tsx` | multiple debounced inputs (250/300 ms) | `GET /general-items?q&supplierName&particulars&billNumber&fromDate&toDate&page&limit` | `listGeneralItems` | `$and` + `$or` with regex fields + date range | single-field indexes only (`supplierName`, `lineItems.particulars`, etc.) | React Query staleTime 60s |
| General Items master search | `GeneralItemsPage.tsx` | none/debounced supplier elsewhere | `GET /general-items-master?q` | `listGeneralItemsMaster` | regex on `itemName` | unique `itemName` index | React Query staleTime 30m |
| Seller history report filter | `Reports.tsx` | raw input, no debounce | `GET /reports/seller-purchase-history?sellerName` | `sellerPurchaseHistory` | regex on `sellerName` | `sellerName` index exists | React Query default |
| Generic DataModule (Users etc.) | `DataModule.tsx` | `useDebounce(300)` | `GET <endpoint>?q&page&limit` | `crudController.list` | regex over configured fields | depends per model | React Query default |
| Global Search | `Layout.tsx` + `GlobalSearchModal.tsx` | `useGlobalSearch`, `useDebounce(300)` | `GET /global-search?q` | `globalSearchController` + `globalSearchService` | parallel regex queries across 6 collections, per-group limit 10 | mixed (several searched fields unindexed) | FE query cache staleTime 5s + BE in-memory TTL cache + localStorage recent terms |

## 2) Global Search Audit

- UI: mounted globally in [Layout.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/components/Layout.tsx).
- Searchable groups: customers, saved blends, customer tea blends, purchase batches, general items, batch ingredients, tea powder types, suppliers.
- Backend path: [globalSearchRoutes.ts](/Users/admin/Desktop/Amaravathi/apps/api/src/routes/globalSearchRoutes.ts) -> [globalSearchController.ts](/Users/admin/Desktop/Amaravathi/apps/api/src/controllers/globalSearchController.ts) -> [globalSearchService.ts](/Users/admin/Desktop/Amaravathi/apps/api/src/services/globalSearchService.ts).
- Result grouping/order: fixed module order in [SearchResultList.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/components/SearchResultList.tsx).
- Ranking logic: no explicit scoring; DB default order.
- Permission filter: `viewer` role excludes customers/suppliers/inventory queries.
- Result limits: 10 per queried collection (ingredients post-sliced to 10).
- Keyboard UX: `Ctrl/Cmd+K`, `Esc`, up/down, enter.
- Highlighting: frontend `<mark>` via regex split in [SearchResultItem.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/components/SearchResultItem.tsx).
- API strategy: single dedicated global API (not fan-out from client).
- Cache: FE React Query 5s + BE process-local `BoundedTtlCache` TTL from env.

## 3) Search Configuration Audit

Observed config locations:
- Debounce: mostly hardcoded `300ms`, one `250ms`.
- Min chars: global search enforces `>=2` both FE and BE; some autocomplete uses `>=2` or `>=3`.
- Default page size: usually 20, sometimes hardcoded 50/75/100/1000.
- Max result size: backend clamps `limit <= 100` in generic list handlers; some endpoints bypass paging.
- Cache TTL: backend from `CACHE_TTL_MS` fallback 5m; global and general-item rate-history share same TTL source.
- Query timeout/ranking weights: none centralized.

Conclusion: configuration is fragmented and mostly hardcoded.

## 4) Search Cache Audit

Frontend:
- Global defaults in [main.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/main.tsx): `staleTime=5m`, `gcTime=30m`.
- Per-query overrides:
  - global search: `staleTime=5s`.
  - general-items purchases: `staleTime=60s`.
  - seller/master dropdown lists: `staleTime=30m`, `gcTime=60m`.
  - rate history: `staleTime=5m`.
- Invalidation: many `invalidateQueries`, but global-search query key is never invalidated on mutations.

Backend:
- No Redis present.
- In-memory TTL caches:
  - global search cache (BoundedTtlCache).
  - general items rate history cache (BoundedTtlCache).
  - stock summary manual timestamp cache (2m TTL).
- Invalidation:
  - general items mutations clear rate-history + stock-summary cache.
  - global search cache has no mutation-triggered invalidation.

Browser HTTP cache:
- No explicit `Cache-Control`/ETag logic for search endpoints detected.

## 5) Search Cache Expiration Rules

- Does cache expire: yes (TTL-based).
- TTL duration:
  - Backend search-like caches default 5m unless `CACHE_TTL_MS` set.
  - FE varies 5s to 30m.
- TTL configurable: backend yes (`CACHE_TTL_MS`), FE mostly hardcoded.
- Stale results risk: yes, especially global search (TTL + no mutation invalidation).
- Cache key normalization:
  - global BE key lowercases/trims + role prefix.
  - FE keys generally include raw debounced values (not centralized normalizer).

## 6) Search Query Audit

Patterns found:
- Heavy `$regex` usage across modules.
- No `$text` or Atlas Search usage.
- `.lean()` used broadly (good).
- Pagination present on most list endpoints; some list calls use large limits (up to 1000).
- Sort order mostly deterministic (`createdAt`, `purchaseDate`).

Flags:
- Potential unbounded scans via case-insensitive regex with non-anchored patterns (`i`).
- Global search mixes anchored (`^`) and contains regex; contains queries on array fields can scan more.
- No centralized projection policy; some endpoints return broad docs.
- No explicit query timeout controls.

## 7) Database Index Audit

Good coverage:
- `Customer`: `name`, unique `nameKey`, unique partial `mobileNumber`, `deletedAt+active`.
- `AddPurchaseBatch`: `batchCode`, `sellerName`, `billNumber`, `purchaseDate`, `lineItems.teaPowderTypeName`, compound identity index.
- `GeneralItemPurchase`: `purchaseDate`, `supplierName`, `lineItems.particulars`, `billNumber`, `deletedAt`.
- `GeneralItemsMaster`: unique partial `itemName`.

Gaps:
- `CustomerTeaFormula` search uses `formulaCode` regex but no index on `formulaCode` for search (it is unique field; Mongo builds unique index, but regex contains can still degrade).
- `globalSearchService` queries fields without matching indexes in some models (`notes`, `description`, `address`, nested ingredient names).
- Compound indexes for common filter combos missing:
  - general items: `(deletedAt, purchaseDate)` and `(deletedAt, supplierName, purchaseDate)` would help.
  - batch list: `(purchaseDate, sellerName)` already partly covered but not tuned for full mixed regex.

## 8) API Search Audit

Strengths:
- Primary standard param `q` is widely used.
- Most endpoints apply pagination with bound `limit<=100`.
- Regex escaping utility is used widely (`escapeRegex`).
- Auth middleware protects APIs; role checks on sensitive mutations.

Gaps:
- Parameter naming not fully standardized (`sellerName`, `particulars`, etc. vary by endpoint by design, but no central contract file).
- Input length caps for `q` not enforced globally.
- No centralized pagination/query validator middleware.
- No rate limiting middleware for high-frequency search endpoints.

## 9) Frontend Search Audit

Strengths:
- Controlled inputs + debouncing almost everywhere.
- Loading/empty states and keyboard navigation in global search.
- URL sync for several module searches (`q` via `useSearchParams`).

Gaps:
- Duplicate search UI logic repeated across `Modules.tsx`, `DataModule.tsx`, `SavedFormulasPage.tsx`, `GeneralItemsPage.tsx`.
- No shared `useSearch` abstraction.
- Query key conventions are inconsistent (`batches`, `batchesList`, `report-batches`, etc.).

## 10) Dropdown & Autocomplete Audit

- Add Purchase Batch: local filtering + optional server search (`teaPowderTypes-search`) with min chars 2.
- Seller dropdown in General Items: server-filtered with debounced search term.
- Create-new options supported.
- Duplicate request prevention relies on React Query keying.
- Selected value preservation: implemented via controlled local state.
- Gaps: not centralized; min-char policy inconsistent (`2` vs `3`).

## 11) Search Security Audit

Findings:
- Regex escaping is implemented and used.
- APIs are auth-protected.
- No explicit rate-limiter for search abuse.
- No explicit max query length/sanitization middleware per endpoint.
- Sensitive fields are mostly excluded by `.select` in global search; generic CRUD may still expose wide model shapes depending on schema.

## 12) Search Performance Audit

Static-code evidence:
- Debounce exists, reducing keystroke storms.
- No backend metrics for cache hit rate/search latency exposed.
- Some endpoints request `limit=1000` from UI, which can increase payload and parse cost.
- Global search performs 6 parallel collection queries + mapping each request, cached only in-process.

Likely bottlenecks:
- Regex contains matches on non-index-friendly fields.
- No shared normalized query planner; duplicated query construction across controllers.
- Cross-tab/query-key duplication causing avoidable cache misses.

## 13) Search Naming Audit

Current:
- Mostly `q`, `query`, `searchQuery`, `debouncedSearchQuery`.
- Also `sellerSearch`, `supplierSearchTerm`, `particulars`, etc.

Verdict:
- API-level standard `q` is mostly good.
- Internal naming is inconsistent and not governed by shared naming constants.

## 14) Dead Code / Duplication Audit

Duplication hotspots:
- Repeated debounced search + pagination + query key patterns in multiple pages.
- Repeated regex filter assembly in `crudController`, `masterController`, and module controllers.
- Global search regex escape duplicated (local replace in service vs shared util available).

Potential dead/legacy:
- `docs/full_stack_audit_report_2026-05-19.md` references `searchController.ts` as likely unused; current active path is `globalSearchController`.

## 15) SSOT Audit Verdict

No full Search SSOT exists today.

Missing required centralized artifacts:
- Backend: `search.constants.ts`, `search.utils.ts`, `search.service.ts`, `search.cache.ts`, `global-search.service.ts` (only global service exists, not unified).
- Frontend: `search.constants.ts`, `useSearch.ts`, `useGlobalSearch.ts` (exists but global-only), `search-query-keys.ts`.

## 16) Recommended Search SSOT Design

Backend:
- `src/search/search.constants.ts`: min chars, default/max limit, TTL, allowed sort fields, max query length.
- `src/search/search.utils.ts`: `normalizeQuery`, `escapeRegex`, `buildRegex`, `buildPagination`, `buildCacheKey`.
- `src/search/search.cache.ts`: pluggable cache adapter (`memory` now, `redis` later).
- `src/search/search.service.ts`: module-agnostic search/filter builder.
- `src/search/global-search.service.ts`: orchestrates per-module adapters with permissions and weighted ranking.

Frontend:
- `src/search/search.constants.ts`: debounce/min-chars/default page limits/stale windows.
- `src/search/search-query-keys.ts`: typed key factories.
- `src/search/useSearch.ts`: reusable hook for module search + URL sync + debounce.
- `src/search/useGlobalSearch.ts`: keep current UX but consume shared constants and query keys.
- Shared `SearchInput.tsx` and `AutocompleteSearchInput.tsx`.

## 17) Standard Search Workflow (Target)

1. Normalize/validate query.
2. Enforce min chars + max length.
3. Build canonical cache key.
4. Check cache.
5. Execute indexed query plan.
6. Project minimal fields.
7. Return paged results.
8. Invalidate affected keys on mutation events.

## 18) Recommended Defaults (Target)

- Min chars: 2
- Debounce: 300ms
- Default limit: 20
- Max limit: 100
- Search cache TTL: 120s
- Global search per-module cap: 5 (or 10 configurable)
- React Query `staleTime`: 30s for live search
- React Query `gcTime`: 5m

## 19) Cache Invalidation Rules (Target)

Invalidate search caches on:
- create/update/delete
- bulk imports
- stock adjustments
- restore/archive

Current gap:
- Global search backend cache is not invalidated on mutations.

## 20) Final Deliverables Summary

1. Current architecture map: provided above.
2. Search endpoint list:
   - `GET /global-search`
   - `GET /tea-powder-types`
   - `GET /sellers`
   - `GET /customers`
   - `GET /add-purchase-batch`
   - `GET /add-purchase-batch/search`
   - `GET /customer-tea-formulas`
   - `GET /general-items`
   - `GET /general-items-master`
   - `GET /general-items/rate-history`
   - `GET /general-items/stock-summary`
   - `GET /reports/seller-purchase-history`
3. Cache strategy/TTLs: in-memory backend + React Query + localStorage recent terms.
4. DB index recommendations:
   - add/verify compound indexes for frequent filter combos in general items.
   - review global-search fields and add selective indexes where cardinality justifies.
   - avoid broad contains-regex where anchored lookup or normalized-key exact/prefix is possible.
5. Duplicate code list: module-level search hooks/UI/query-key patterns + backend regex filter builders.
6. Security findings: no rate-limit/max-query-length guard; regex escape good.
7. Performance findings: regex-heavy multi-collection search, large list fetches (`limit=1000`), no unified telemetry.
8. SSOT gap: partial only; no centralized search architecture.
9. Refactor plan:
   - Phase 1: introduce shared constants/utils/query-key factories (no behavior change).
   - Phase 2: migrate module pages to `useSearch`.
   - Phase 3: unify backend list/search filters into search service.
   - Phase 4: implement mutation-driven cache invalidation bus.
   - Phase 5: tune indexes using real query profiler stats.
10. Recommended SSOT architecture: section 16.

---

## Priority Findings

- High: Global search cache can return stale data after mutations (no invalidation).
- High: Search logic duplicated across many controllers/pages; drift risk against SSOT policy.
- Medium: Inconsistent cache/query settings and naming conventions.
- Medium: Regex-heavy contains search without centralized max-length/rate-limit controls.
- Medium: No Redis/distributed cache; process-local cache means inconsistent behavior across scaled instances.
