# Repository Policy

This document defines the minimum engineering gates for pull requests.

## Branches

- Protected branches: `main`, `develop`, `staging`
- All changes to protected branches must come through PRs.

## Required PR Checks

The GitHub Actions workflow `PR Quality Gates` runs on every PR to protected branches and must pass:

1. `pnpm -w run typecheck`
2. `pnpm -w run lint`
3. `pnpm -w run dead-code:ci`
4. `pnpm -w run duplicates:ci`

Combined command:

```bash
pnpm -w run quality:pr
```

## Code Quality Rules

1. Do not add temporary scripts under tracked app source directories.
2. Keep one canonical schema/contract path; avoid parallel legacy payload shapes.
3. Keep generated artifacts in canonical folders only (no duplicate copies).
4. If compatibility code is needed, create a migration ticket and removal deadline in the same PR.

## Local Pre-PR Checklist

Before opening a PR:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm -w run quality:pr
```

## Vercel Deployment Hygiene

1. Vercel-oriented scripts must use pnpm-native workspace commands; do not use nested `npm run --workspace`.
2. Root `package.json` must keep `\"engines\": { \"node\": \"22.x\" }`.
3. Root `.nvmrc` must stay aligned with the Node engine major (`22`).
4. Vercel project settings must keep:
   - Install Command: `corepack enable && pnpm install --frozen-lockfile`
   - Build Command: `pnpm -w run build:vercel`
   - Node.js Version: `22.x`

## CI Baseline Notes

- `knip.json` contains explicit ignores for approved one-off operational files.
- Duplicate threshold in CI is set to `5.3%` to prevent regression while existing duplication is being reduced incrementally.

## Search Governance

- Search SSOT guardrails must pass on every PR: `npm run search:ssot:verify`.
- Search benchmark regression checks must pass: `npm run search:benchmark:regression`.
- Search release readiness checks must pass before merge: `npm run search:release:check`.

## React Context Import Invariants

- `NotificationContext` has a single canonical import path: `@/components/NotificationContext`.
- Do not import `NotificationContext`, `NotificationProvider`, or `useNotification` via relative paths or alternate aliases.
- `NotificationProvider` must be mounted once at app root and must not be re-declared in feature modules.

## Test Runner Isolation

- Playwright E2E tests must use `*.e2e.spec.ts` and live under `apps/admin-web/tests/e2e`.
- Vitest tests must use `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` for unit/integration scope only.
- Vitest must exclude all E2E paths/patterns (`tests/e2e/**`, `**/*.e2e.spec.*`).
- Playwright must only scan `apps/admin-web/tests/e2e`.

## Dead Code Governance

- `knip` findings must be resolved before merge by either:
  1. removing dead code, or
  2. adding an explicit `knip.json` ignore entry for intentional operational/CLI files.
- Every intentional `knip` ignore must have justification in the related quality audit report.
