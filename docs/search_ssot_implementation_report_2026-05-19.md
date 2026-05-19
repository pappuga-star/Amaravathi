# Search SSOT Implementation Report (2026-05-19)

## Implemented

### Backend SSOT package
Created `apps/api/src/search/`:
- `search.constants.ts`
- `search.validators.ts`
- `search.utils.ts`
- `search.cache.ts`
- `search.service.ts`
- `search.events.ts`
- `search.types.ts`
- `global-search.service.ts`
- `index.ts`

### Global search refactor
- `apps/api/src/services/globalSearchService.ts` now re-exports SSOT global search.
- `apps/api/src/controllers/globalSearchController.ts` now uses centralized constants/utils/validation semantics.
- Global cache keying moved to shared cache abstraction with configurable TTL.

### Module/list search centralization
- `crudController.list` migrated to `runListSearch`.
- `masterController.list` migrated to `runListSearch`.
- `addPurchaseBatchController.list/search` migrated to shared regex/validation/search service.
- `generalItemsController.list` and `generalItemsMaster.list` migrated to `runListSearch`.
- `customerTeaFormulaController.list` now uses centralized query validation + regex builder and standardized pagination block.

### Cache invalidation events
Added centralized invalidation calls after create/update/delete/restore paths:
- `crudController`
- `masterController`
- `addPurchaseBatchController`
- `generalItemsController`
- `customerTeaFormulaController`
- custom delete handlers in `routes/index.ts` for tea powder type/seller/customer

### Index governance updates
Updated `GeneralItemPurchase` indexes:
- `{ deletedAt: 1, purchaseDate: -1 }`
- `{ deletedAt: 1, supplierName: 1, purchaseDate: -1 }`

### Frontend SSOT package
Created `apps/admin-web/src/search/`:
- `search.constants.ts`
- `search-query-keys.ts`
- `search.types.ts`
- `useSearch.ts`
- `useGlobalSearch.ts`
- `SearchInput.tsx`
- `AutocompleteSearchInput.tsx`
- `index.ts`

### Frontend integration updates
- `hooks/useGlobalSearch.ts` now re-exports new SSOT hook.
- `main.tsx` now uses SSOT cache defaults.
- `lib/globalSearchApi.ts` now uses centralized min-character constant.
- `components/DataModule.tsx` now uses centralized debounce/default-limit constants and shared `SearchInput`.

## API contract standardization

Search/list endpoints migrated in this implementation now return:
- `items`
- `pagination` (`page`, `limit`, `totalItems`, `totalPages`)
- plus legacy fields (`total`, `page`, `limit`) for backward compatibility.

## Validation/security controls added

- Centralized query normalization and max length enforcement.
- Centralized page/limit clamping (`limit <= 100`).
- Centralized sort validation support.
- Shared regex escaping and regex builders.

## Verification

- `npm run typecheck` passes across workspaces.
- `npm run lint` fails in repository due pre-existing lint error in `apps/api/src/middleware/requestProfiler.ts` and existing warnings unrelated to this SSOT change set.

## Compliance summary vs requested architecture

- Implemented: centralized backend search core, centralized frontend search core, global search shared logic, cache abstraction, mutation-triggered invalidation, index updates, typed query keys, reusable search inputs.
- Partially implemented: full migration of every single frontend screen to `useSearch` and complete elimination of all legacy query-key strings (core path migrated; some modules still use legacy keys/hooks).
- Backward compatibility retained by preserving legacy response fields alongside new `pagination`.
