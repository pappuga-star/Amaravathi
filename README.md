# Amaravathi Tea Pricing System

Phase 1 focuses only on **Tea Powder Purchase Rate Verification**.

The system stores purchase batches, auto-generates batch codes from SOP, and lets users quickly verify tea powder purchase rates by batch code, tea powder name, or supplier / bill name.

## Phase 1 Scope

Included:

- User frontend login
- JWT session persistence
- Role-based access
- Category master
- Tea grade / tea powder master
- Purchase batch entry
- Automatic batch code generation
- Batch search
- Tea powder rate verification
- Batch reports
- Latest purchase rate reports

Excluded for Phase 1:

- Formula costing
- Customer recipes
- Selling price calculation
- Inventory
- Warehouse tracking
- Accounting
- Production planning

## 🌟 Enterprise Refinements: Unified Notifications & Validation Audit

As part of the system hardening and visual polish audit, we systematically replaced all legacy browser popups (`alert()`, `window.alert()`, `window.confirm()`) with a premium, centralized application notification suite:

1. **Centralized Notification System** (`NotificationContext.tsx`):
   - **Custom Toasts**: Responsive toast pop-ups for success alerts, critical validation errors, and custom warnings matching the emerald/slate palette.
   - **Promise-Based Confirmation Modals**: Seamless confirmation pop-ups with custom contextual buttons (e.g., danger-themed actions for deletions).
   - **Validation Errors & Highlight Actions**: Raw Zod parsing errors are filtered and sanitized into clear business descriptions. Fields containing invalid values instantly transition to rose borders and trigger smooth scrolling to the first invalid field.
2. **Type-Safe Workspace Consolidation**:
   - Addressed strict TypeScript configurations (`exactOptionalPropertyTypes`) to ensure that all workspaces pass standard production builds (`npm run build`) cleanly without type warnings.

## Apps

- `apps/api` - Express, TypeScript, MongoDB/Mongoose REST API.
- `apps/admin-web` - Admin React frontend for categories, tea powders, purchase batches, users, and reports.
- `apps/user-web` - Operator React frontend for fast purchase-rate verification.
- `packages/shared-types` - Shared Zod schemas and TypeScript contracts.
- `packages/shared-utils` - Shared utilities, including batch code generation.
- `packages/shared-ui` - Shared Tailwind UI primitives.

## Engineering Policy

- Repository policy and PR quality gates: [docs/repo-policy.md](./docs/repo-policy.md)

## Quick Start

```bash
cd /Users/admin/Desktop/Amaravathi
npm install
cp apps/api/.env.example apps/api/.env
npm --workspace @amaravathi/api run seed
npm run dev
```

Open:

- Admin: `http://localhost:5173`
- User: `http://localhost:5174`
- API health: `http://localhost:4000/api/health`

## Login

Admin:

- Email: `admin@amaravathi.local`
- Password: `Admin@12345`

Operator:

- Email: `operator@amaravathi.local`
- Password: `Operator@12345`

## Demo Data

The seed creates:

- Categories: Dust, Leaf, Lumsa, Color, Tea Powder, Addon
- Tea powders: Strong Dust, Fine Dust, Economy Leaf, Premium Leaf, Standard Lumsa, Color Tea
- Purchase batch: `30/12/25`
- Supplier / Bill Name: `ABC Tea Traders`
- Invoice Number: `INV-1001`

In the user frontend, search:

- `30/12/25`
- `Strong Dust`
- `ABC Tea Traders`

## Batch Code SOP

Batch code is generated automatically:

```text
<No of Bags>/<Purchase Month>/<Purchase Year>
```

Example:

```text
30/12/25
```

Meaning:

- `30` = number of bags
- `12` = purchase month
- `25` = purchase year

## MongoDB

Local database connection:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/amaravathi_tea_pricing
```

Phase 1 collections:

- `users`
- `teacategories`
- `teagrades`
- `purchaserates`

Unique constraints:

- `users.email`
- `teacategories.nameKey`
- `teagrades.categoryId + nameKey`
- `purchaserates.batchCode`
