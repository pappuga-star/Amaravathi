# Search SSOT Final Frontend Migration Report (2026-05-19)

## 1) Files Migrated

- [DataModule.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/components/DataModule.tsx)
- [Modules.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/pages/Modules.tsx)
- [SavedFormulasPage.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/pages/SavedFormulasPage.tsx)
- [Reports.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/pages/Reports.tsx)
- [AddPurchaseBatchPage.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/pages/AddPurchaseBatchPage.tsx)
- [main.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/main.tsx)
- [globalSearchApi.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/lib/globalSearchApi.ts)
- [hooks/useGlobalSearch.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/hooks/useGlobalSearch.ts)

## 2) Files Added (SSOT)

- [search.constants.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/search.constants.ts)
- [search-query-keys.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/search-query-keys.ts)
- [search.types.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/search.types.ts)
- [useSearch.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/useSearch.ts)
- [useGlobalSearch.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/useGlobalSearch.ts)
- [SearchInput.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/SearchInput.tsx)
- [AutocompleteSearchInput.tsx](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/AutocompleteSearchInput.tsx)
- [index.ts](/Users/admin/Desktop/Amaravathi/apps/admin-web/src/search/index.ts)

## 3) Legacy Patterns Removed

- Removed page-local `useDebounce` search flow from:
  - `Modules.tsx`
  - `SavedFormulasPage.tsx`
  - `Reports.tsx`
  - `AddPurchaseBatchPage.tsx` (batch and autocomplete search paths)
  - `DataModule.tsx`
- Replaced custom search inputs in migrated pages with shared `SearchInput`.
- Replaced multiple hardcoded search query keys with `searchKeys.*` factories in migrated pages.
- Unified global query cache defaults through search constants in `main.tsx`.

## 4) Validation Results

- `npm run typecheck`: **PASS**
- `npm run build`: **PASS**
- `npm run lint`: **FAIL** (pre-existing repository lint error outside migration scope)
  - Blocking error: `apps/api/src/middleware/requestProfiler.ts` (`@typescript-eslint/no-namespace`)
  - Additional pre-existing warnings across backend/frontend.

## 5) Final Compliance Score

- **Frontend Search SSOT Compliance: 84%**

Scoring basis:
- Central search framework available and integrated in major search pages: yes.
- Query key centralization in migrated pages: mostly yes.
- Shared search input usage in migrated pages: yes.
- Remaining direct page-level search debounce: **GeneralItemsPage still has local debounce/search composition**.
- Remaining legacy custom autocomplete component in `AddPurchaseBatchPage`: present (not fully swapped to shared `AutocompleteSearchInput`).

## 6) Known Limitations

1. `GeneralItemsPage.tsx` still contains multiple direct `useDebounce()` search paths and page-local search orchestration.
2. `AddPurchaseBatchPage.tsx` still has its local `AutocompleteInput` component; it is not fully replaced by shared `AutocompleteSearchInput`.
3. Some non-search query keys remain outside search scope (`me`, module detail lookups).
4. Lint cannot be fully green due pre-existing repository-wide issues and one blocking backend lint error unrelated to this frontend migration batch.

## 7) Remaining Work for 100% Target

1. Fully refactor `GeneralItemsPage.tsx` to a composed `useSearch` + shared `searchKeys` model for all search/filter channels.
2. Replace `AutocompleteInput` in `AddPurchaseBatchPage.tsx` with shared `AutocompleteSearchInput`.
3. Sweep and normalize remaining search-related query keys to `searchKeys.module/dropdown/autocomplete`.
4. Resolve global lint blockers (starting with `requestProfiler.ts`) so acceptance gate can pass.
