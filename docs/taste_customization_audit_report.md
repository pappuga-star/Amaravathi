# 🍵 Taste Customization Module: Enterprise-Level System Audit Report

## 1. Executive Summary

This report presents a comprehensive enterprise-level audit of the **Taste Customization (Design Custom Tea Formula)** module in the Amaravathi Tea Pricing System. The audit compares the current implementation in the frontend React application (`apps/admin-web/src/pages/CustomerFormulasPage.tsx`, `SavedFormulasPage.tsx`), the backend API (`apps/api/src/controllers/customerTeaFormulaController.ts`, `src/routes/index.ts`), and the MongoDB database models (`CustomerTeaFormula.ts`, `CustomerTeaFormulaHistory.ts`) against the formal business specification.

### Summary of System Health
While the module establishes solid core pricing logic, real-time recalculation widgets, and robust stock-safety checks, it suffers from several **blocking functional gaps**—most notably the **complete absence of a draft saving mechanism**, the **lack of an Edit/Modify interface** for existing formulas, and the **absence of header customization inputs** on the frontend form.

Additionally, a significant architectural naming divergence exists: the system uses the internal naming convention `/customer-tea-formulas` and `CustomerTeaFormula`, whereas the business specification establishes `/taste-customizations` and `tasteCustomization` as the canonical enterprise terminology.

---

## 2. Quantitative System Scorecard

| Dimensions | Score | Assessment |
| :--- | :---: | :--- |
| **Functional Compliance Score** | **65%** | Core calculations & validations are correct, but Draft saving and Edit modes are completely missing. |
| **UI/UX Score** | **70%** | Sticky widgets and tables are sleek and premium, but header text inputs are missing, and no edit triggers exist. |
| **Backend Quality Score** | **85%** | Robust validation and history snapshot tracking, though draft persistence is missing. |
| **Database Quality Score** | **90%** | Correct indices and structure; legacy field support is preserved for compatibility. |
| **API Quality Score** | **75%** | Clean REST design, but naming diverges from canonical specification endpoints. |
| **Code Quality Score** | **88%** | Highly structured TypeScript, robust React hooks, and strict population parsing. |
| **Security Score** | **95%** | Enforces strict role-based access control (`admin` and `pricing_manager` for writes). |
| **Performance Score** | **90%** | Efficient populations, duplicate prevention, and zero-division protection on the canvas. |
| **Naming Convention Score** | **70%** | Divergence between `/customer-tea-formulas` and the canonical `/taste-customizations`. |
| **Test Coverage Score** | **55%** | Validation schema tests exist, but frontend state, calculation, and UI tests are absent. |

---

## 3. High-Priority Deficit Logs

### Critical Issues

#### 🚨 CR-01: Complete Absence of Edit/Modify Flow on the Frontend
* **Affected Files**: `SavedFormulasPage.tsx`, `CustomerFormulasPage.tsx`
* **Affected Functions**: Table rows in `SavedFormulasPage.tsx`, state initialization in `CustomerFormulasPage.tsx`.
* **Root Cause**: The layout in `SavedFormulasPage.tsx` only offers `View`, `Duplicate`, `Set Default`, and `Delete` actions. It lacks an `Edit` action. Furthermore, `CustomerFormulasPage.tsx` operates solely in a static "Create" mode, lacking any `editingId` tracking, update mutations, or state hydration logic to load an existing formula into the form.
* **Impact**: Once a custom formula is designed and saved, it is immutable in the UI. Administrators cannot correct errors or update weights without deleting and re-creating the entire formula.
* **Corrected Implementation Recommendation**:
  * Implement an `onEdit(formula: CustomerTeaFormula)` handler on `TasteCustomizationMasterPage` to pass the editing record into `CustomerFormulasPage`.
  * Hydrate the state of `CustomerFormulasPage` with the selected formula's header and line items.
  * Connect the submit button to the `PUT /customer-tea-formulas/:id` backend route.

#### 🚨 CR-02: Missing Draft Saving and Draft Status Management
* **Affected Files**: `packages/shared-types/src/index.ts` (Zod schema), `apps/api/src/models/CustomerTeaFormula.ts`, `apps/api/src/controllers/customerTeaFormulaController.ts`, `apps/admin-web/src/pages/CustomerFormulasPage.tsx`
* **Root Cause**: The status field in the Zod and Mongoose schemas is strictly limited to an enum of `['Active', 'Inactive']`. There is no `Draft` status option, no "Save as Draft" action button in the frontend form, and no `/save-draft` API endpoint implemented.
* **Impact**: Administrators are forced to save incomplete or unverified formula designs as "Active" formulas, which compromises database integrity and can lead to pricing calculation errors in downstream modules.
* **Corrected Implementation Recommendation**:
  * Expand Zod and Mongoose status enums to: `status: z.enum(['Active', 'Inactive', 'Draft'])`.
  * Add a "Save as Draft" button next to "Save Formula" inside the sticky price widget.
  * Add a backend handler for `POST /taste-customizations/:id/save-draft` or set the status parameter to `Draft` during save.

---

### High Priority Issues

#### 🟡 HP-01: Missing Manual Header Inputs (Formula Name & Tea Powder Type)
* **Affected Files**: `apps/admin-web/src/pages/CustomerFormulasPage.tsx` (Lines 320–406)
* **Root Cause**: While `formulaName` and `teaPowderType` are declared as state variables, they are not rendered as input elements in the JSX form. The UI hardcodes the name to `"${customerName}'s Formula"` and the type to `"Custom Blend"` when a customer is chosen, preventing manual adjustments.
* **Impact**: Administrators cannot name the formulas descriptively (e.g., "Premium Strong Cardamom Blend") or customize the specific tea powder type category.
* **Corrected Implementation Recommendation**:
  * Insert distinct `<Input>` components for **Formula Name** and **Tea Powder Type** inside the formula header card, bound to their respective state setters.

#### 🟡 HP-02: Route and Model Terminology Inconsistency
* **Affected Files**: All frontend API hooks, backend router `src/routes/index.ts`, Mongoose models `CustomerTeaFormula.ts`, `CustomerTeaFormulaHistory.ts`
* **Root Cause**: The codebase uses the terminology `/customer-tea-formulas` and `CustomerTeaFormula`, whereas the business specification explicitly defines `/taste-customizations` and `tasteCustomization` as the canonical enterprise names.
* **Impact**: Increases cognitive load for developers and diverges from the formal REST API contract defined in the business documentation.
* **Corrected Implementation Recommendation**:
  * Add route aliases to `apps/api/src/routes/index.ts` to map `/taste-customizations` to the existing controller handlers to maintain compatibility while standardizing paths.

---

### Medium Priority Issues

#### 🟢 MP-01: Manual Ingredient Category Selection Disabled
* **Affected Files**: `apps/admin-web/src/pages/CustomerFormulasPage.tsx` (Line 166)
* **Root Cause**: The `ingredientCategory` column is auto-detected from the item name using text pattern matching (`dust`, `color`, `lumsa` -> `Add-On`, otherwise `Leaf`). There is no interactive select field allowing users to manually classify an ingredient.
* **Impact**: If a new ingredient type is introduced that does not match these hardcoded text patterns, it will be misclassified in calculations and reports.
* **Corrected Implementation Recommendation**:
  * Add a read/write dropdown selection for the **Category** column in the ingredient grid, defaulting to the auto-detected category but permitting manual overrides.

---

## 4. Comprehensive Business Logic Check

| Specification Requirement | Implemented? | Audit Details & Status |
| :--- | :---: | :--- |
| **Formula Name Header Field** | **Partial** | Defined in state, but **no input element** is provided in the form for manual customization. |
| **Tea Powder Type Header Field** | **Partial** | Hardcoded to `"Custom Blend"` upon selection; **no input element** is provided. |
| **Notes Header Field** | **Yes** | Fully supported in state and rendered as Notes/Remarks text input. |
| **Row-level Cost & Price/g** | **Yes** | Read-only columns correctly display price per gram and row cost based on selected batch item. |
| **Ingredient Category Options** | **Partial** | Backend and schemas support `Leaf` and `Add-On`. Frontend auto-detects but **does not allow manual selection**. |
| **Stock Validation** | **Yes** | Enforced in both frontend `stockErrors` and backend controller stock checks. |
| **Duplicate Prevention** | **Yes** | Enforced at row-level `duplicateKeys` checking and backend combinations check. |
| **Cost Per KG Calculation** | **Yes** | Computed in real-time as `(Total Cost / Total Weight) * 1000`. |
| **Cost Per 100g Calculation** | **Yes** | Computed in real-time as `(Total Cost / Total Weight) * 100`. |
| **Set as Default Formula** | **Yes** | Interactive checkbox updates database default status and automatically clears other defaults. |

---

## 5. Calculation Logic Verification

Let's audit the exact formulas implemented in `CustomerFormulasPage.tsx` and `customerTeaFormulaController.ts`:

### 1. Row Cost
$$\text{Row Cost} = \text{quantityInGrams} \times \text{pricePerGram}$$
* **Frontend Implementation** (Line 180):
  ```typescript
  current.rowCost = Number((current.quantityInGrams * current.pricePerGram).toFixed(4));
  ```
* **Backend Implementation** (Line 195):
  ```typescript
  const rowCost = Number((item.quantityInGrams * pricePerGram).toFixed(4));
  ```
* **Audit Verdict**: **Passes**. High-precision 4-decimal rounding ensures price accuracy.

### 2. Total Weight & Total Formula Cost
$$\text{Total Weight} = \sum \text{quantityInGrams}$$
$$\text{Total Formula Cost} = \sum \text{rowCost}$$
* **Frontend Implementation** (Lines 221–234):
  ```typescript
  liveTotals = {
    totalWeight: Number(totalWeight.toFixed(2)),
    totalFormulaCost: Number(totalFormulaCost.toFixed(2)),
  }
  ```
* **Backend Implementation** (Lines 196–207):
  ```typescript
  totalFormulaCost = Number(totalFormulaCost.toFixed(4));
  totalWeight = Number(totalWeight.toFixed(4));
  ```
* **Audit Verdict**: **Passes**. Enforces proper float formatting.

### 3. Cost Per KG & Cost Per 100 Grams
$$\text{Cost Per KG} = \left( \frac{\text{Total Formula Cost}}{\text{Total Weight}} \right) \times 1000$$
$$\text{Cost Per 100g} = \left( \frac{\text{Total Formula Cost}}{\text{Total Weight}} \right) \times 100$$
* **Frontend Implementation** (Lines 229–230):
  ```typescript
  const costPerKg = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 1000).toFixed(2)) : 0;
  const costPer100Grams = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 100).toFixed(2)) : 0;
  ```
* **Backend Implementation** (Lines 208–209):
  ```typescript
  const costPerKg = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 1000).toFixed(4)) : 0;
  const costPer100Grams = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 100).toFixed(4)) : 0;
  ```
* **Audit Verdict**: **Passes**. Div-by-zero protection (`totalWeight > 0`) is correctly implemented, avoiding `NaN` or infinity errors.

---

## 6. Recommended Refactoring Plan

### Phase 1: Terminology and Route Standardization
To fulfill the business specification, the routes and APIs should support canonical terminology. Adding route aliases is the safest, backward-compatible way to achieve this:
```typescript
// apps/api/src/routes/index.ts
// Add aliases mapping /taste-customizations to customerTeaFormulasController
router.get('/taste-customizations', asyncHandler(customerTeaFormulasController.list));
router.post('/taste-customizations', permit('admin', 'pricing_manager'), asyncHandler(customerTeaFormulasController.create));
router.get('/taste-customizations/:id', asyncHandler(customerTeaFormulasController.get));
router.put('/taste-customizations/:id', permit('admin', 'pricing_manager'), asyncHandler(customerTeaFormulasController.update));
router.delete('/taste-customizations/:id', permit('admin'), asyncHandler(customerTeaFormulasController.remove));
```

### Phase 2: Complete the Frontend Header Customization
Modify the form layout in `CustomerFormulasPage.tsx` to include customizable input fields for **Formula Name** and **Tea Powder Type**:
```tsx
{/* Insert inside form before the ingredient table */}
<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
  <div className="grid gap-1.5">
    <span className="text-sm font-medium text-slate-700">Formula Name <span className="text-red-500">*</span></span>
    <Input
      type="text"
      placeholder="Enter custom formula name..."
      value={formulaName}
      onChange={(e) => setFormulaName(e.target.value)}
      required
      disabled={!canEdit}
    />
  </div>
  <div className="grid gap-1.5">
    <span className="text-sm font-medium text-slate-700">Tea Powder Type <span className="text-red-500">*</span></span>
    <Input
      type="text"
      placeholder="e.g. Cardamom Dust, Leaf Blend..."
      value={teaPowderType}
      onChange={(e) => setTeaPowderType(e.target.value)}
      required
      disabled={!canEdit}
    />
  </div>
</div>
```

---

## 7. Final Go-Live Checklist

* **Ready for Production**: **NO** (due to missing Edit flow and Draft features).
* **Blocking Issues**: **2** (CR-01: Missing Edit flow, CR-02: Missing Draft state).
* **Recommended Deployment Order**:
  1. Update database Mongoose validation to accept `'Draft'` status.
  2. Implement backend `/save-draft` route and payload handler.
  3. Update frontend form inputs (`formulaName` and `teaPowderType`) and integrate the "Edit" form toggle.
  4. Perform data migration to mark unverified formulas as `'Draft'`.
* **Rollback Plan**: In case of regression, restore the frontend form layout to the simplified single-create mode and revert the Mongoose status enums to the simple `'Active'/'Inactive'` set.
