# Amaravathi Validation Audit Report
Date: 2026-05-18
Scope: `apps/api`, `apps/admin-web`, `packages/shared-types`, `packages/shared-utils`

## 1) Validation Inventory
- Shared schemas: `packages/shared-types/src/index.ts` (`userSchema`, `loginSchema`, `teaPowderTypeSchema`, `sellerSchema`, `customerSchema`, `purchaseBatchSchema`, `customerTeaFormulaSchema`)
- API validators/controllers: `apps/api/src/controllers/*.ts`, `apps/api/src/middleware/errorHandler.ts`
- DB constraints/models: `apps/api/src/models/*.ts`
- Frontend form validations: `apps/admin-web/src/pages/AddPurchaseBatchPage.tsx`, `apps/admin-web/src/pages/CustomerFormulasPage.tsx`, `apps/admin-web/src/pages/Modules.tsx`, `apps/admin-web/src/pages/Login.tsx`

## 2) Missing Validations
1. Module: Authentication & Users
- File: `packages/shared-types/src/index.ts`
- Severity: High
- Current behavior: `objectIdSchema` accepted any non-empty string.
- Expected behavior: strict ObjectId format validation.
- Root cause: weak base schema reused across modules.
- Exact code fix: `objectIdSchema` changed to `/^[a-f\d]{24}$/i`.
- Testing steps: call protected endpoints with invalid IDs (`abc`) and confirm `422 Validation failed`.

2. Module: Customers/Suppliers
- File: `packages/shared-types/src/index.ts`
- Severity: High
- Current behavior: phone/mobile accepted loose lengths.
- Expected behavior: 10-digit mobile standard.
- Root cause: no canonical phone schema enforcement.
- Exact code fix: `mobileSchema` set to `^\d{10}$`; applied to `customerSchema.mobileNumber` and `sellerSchema.phone`.
- Testing steps: POST `/customers` with `mobileNumber: "123"` should fail; with `9876543210` should pass.

## 3) Duplicate Validations
1. Module: Formula validation path mapping
- File: `apps/api/src/controllers/customerTeaFormulaController.ts`, `apps/api/src/middleware/errorHandler.ts`
- Severity: Medium
- Current behavior: mixed error formats (`e.errors`, `flatten()` output).
- Expected behavior: uniform field-path map for frontend binding.
- Root cause: local catch logic diverged from global error handler.
- Exact code fix: both now emit `Record<string,string>` keyed by dot path (`lineItems.0.quantityInGrams`).
- Testing steps: send invalid formula payload and verify error response structure maps directly to form field paths.

## 4) Inconsistent Rules (Frontend vs Backend)
1. Module: Customer Formula
- File: frontend `apps/admin-web/src/pages/CustomerFormulasPage.tsx`, backend `packages/shared-types/src/index.ts`
- Severity: High
- Current behavior: frontend allows row creation without completed row; backend requires `purchaseBatchLineItemId` and positive grams.
- Expected behavior: frontend should block submit with field-level markers before API call.
- Root cause: frontend mostly toast-based and row-lock based validation, not schema-driven.
- Exact code fix: not fully implemented in this patch; recommend adopting shared Zod schema on client via resolver.
- Testing steps: submit partially filled row and verify inline field errors before request.

## 5) Database Constraint Gaps
1. Module: Customer uniqueness
- File: `apps/api/src/models/Customer.ts`
- Severity: High
- Current behavior: `mobileNumber` indexed but not unique; `name` not normalized unique.
- Expected behavior: duplicate prevention where business rules require uniqueness.
- Root cause: only basic indexes, no normalized unique keys.
- Exact code fix: pending (recommended: `nameKey` normalized + unique partial index, optional unique mobile partial index).
- Testing steps: insert duplicates differing in case/spaces and confirm rejection.

2. Module: Purchase/Formula numeric integrity
- Files: `apps/api/src/models/AddPurchaseBatch.ts`, `apps/api/src/models/CustomerTeaFormula.ts`
- Severity: Medium
- Current behavior: DB mins allow `0` on some fields where business wants `>0`.
- Expected behavior: strict positive constraints for quantity and price fields.
- Root cause: model min values not aligned to business rules.
- Exact code fix: pending DB schema tightening + migration safety check.
- Testing steps: attempt direct DB write with `quantity=0` and ensure validation fails.

## 6) Security Issues
1. Module: Search APIs
- Files: `apps/api/src/controllers/crudController.ts`, `masterController.ts`, `addPurchaseBatchController.ts`, `customerTeaFormulaController.ts`, `reportController.ts`, `routes/index.ts`, `packages/shared-utils/src/index.ts`
- Severity: Critical
- Current behavior: user input interpolated into `$regex` in several endpoints.
- Expected behavior: escaped regex to prevent regex injection/ReDoS patterns.
- Root cause: inconsistent regex handling.
- Exact code fix: added shared `escapeRegex()` and replaced raw `$regex` strings with safe `RegExp(escapeRegex(q), 'i')`.
- Testing steps: query with regex metacharacters (`.*`, `a{10000}`) and verify stable response/performance.

## 7) Performance Issues
1. Module: Validation execution
- File: `apps/admin-web/src/pages/*`
- Severity: Medium
- Current behavior: custom per-page validation duplicated and rerun ad hoc.
- Expected behavior: centralized schema validation + shared field mapping.
- Root cause: no common client validation abstraction.
- Exact code fix: pending (planned: shared validator hook).
- Testing steps: profile form submit; verify fewer duplicate checks and consistent error handling.

## 8) Fix Plan (Prioritized)
1. Critical: finish regex hardening in any remaining endpoints not using `escapeRegex`.
2. Critical: add DB-level unique/partial indexes for customer/supplier duplicates.
3. High: unify frontend validation on shared Zod schemas for Add Purchase Batch and Customer Formula forms.
4. High: enforce positive numeric constraints in mongoose models where business requires `>0`.
5. Medium: normalize error localization/messages to field-specific text across all forms.

## 9) Code Changes Applied In This Audit
- Added regex sanitization utility: `packages/shared-utils/src/index.ts`
- Strengthened base shared validation:
  - `objectIdSchema` strict ObjectId
  - `mobileSchema` strict 10-digit
  - applied to customer/seller schemas
  (`packages/shared-types/src/index.ts`)
- Standardized Zod error response mapping to dot-path fields:
  - `apps/api/src/middleware/errorHandler.ts`
  - `apps/api/src/controllers/customerTeaFormulaController.ts`
- Replaced unsafe regex usage in key controllers/routes:
  - `apps/api/src/controllers/crudController.ts`
  - `apps/api/src/controllers/masterController.ts`
  - `apps/api/src/controllers/addPurchaseBatchController.ts`
  - `apps/api/src/controllers/customerTeaFormulaController.ts`
  - `apps/api/src/controllers/reportController.ts`
  - `apps/api/src/routes/index.ts`

## 10) Final Compliance Summary (Pass/Fail)
- Authentication & Users: Partial Pass
- Masters (Tea Powder/Leaf/Supplier/Customer): Partial Pass
- Purchase Management: Partial Pass
- Customer Preferences/Formulas: Partial Pass
- Sales/Invoices/Dispatch: Fail (module not present in current codebase)
- Search: Partial Pass (major security gap fixed in this patch)
- Dashboard: N/A for deep validation (display-only in current code)
- Reports: Partial Pass
- Settings: Partial Pass

Overall: **Partial Compliance**. Critical regex-injection risk addressed; full end-to-end compliance still requires DB uniqueness hardening, client schema unification, and unimplemented module coverage.
