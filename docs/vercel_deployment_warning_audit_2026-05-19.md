# Vercel Deployment Warning Audit — 2026-05-19

## Scope
Comprehensive audit and cleanup for Vercel deployment warnings in the pnpm monorepo.

Audited files:
- `package.json` (root)
- `apps/admin-web/package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `.nvmrc`
- repository `.npmrc` files (none found)
- `apps/admin-web/vercel.json`

## Findings (Root Cause Analysis)

### 1) `WARN Unsupported engine: wanted {"node":"22.x"} (...)`
Root cause:
- Root `package.json` correctly requires Node `22.x`, and `.nvmrc` is `22`.
- Warning appears when runtime Node version is not 22.x (local runs here used Node 26.0.0; your Vercel example showed Node 24.15.0).

Impact:
- Informational warning unless runtime incompatibilities exist.
- Should be removed in Vercel by pinning Project Node.js Version to `22.x`.

### 2) `npm warn Unknown env config` (`npm-globalconfig`, `verify-deps-before-run`, `_jsr-registry`, `dir`, `workspace-root`)
Root cause:
- Root orchestration scripts used nested `npm` workspace commands inside a pnpm workspace.
- npm receives pnpm-specific env/config values and logs unknown-config warnings.

Impact:
- Informational log noise.
- Avoidable and removed by migrating root scripts to pnpm-native commands.

## Changes Applied

### `package.json` (root)
1. Added package manager pin:
```json
"packageManager": "pnpm@10.28.0"
```

2. Replaced Vercel build script with pnpm-native filters:
```json
"build:vercel": "pnpm --filter @amaravathi/shared-types build && pnpm --filter @amaravathi/shared-ui build && pnpm --filter @amaravathi/shared-utils build && pnpm --filter @amaravathi/admin-web build"
```

3. Converted root workspace orchestration scripts from npm to pnpm to prevent warning regression:
- `dev`, `dev:api`, `dev:admin`
- `build`, `start`
- `test`, `test:unit`, `test:e2e`, `test:all`
- `lint`, `typecheck`
- `quality`, `quality:pr`
- `test:search:*`, `search:quality:all`

### `docs/repo-policy.md`
- Updated quality-gate and local checklist commands to pnpm.
- Added `Vercel Deployment Hygiene` rules to enforce pnpm-native scripts, Node 22 pinning, and required Vercel settings.

## Node Version Hardening Status

Already correct before changes:
- `package.json` engine:
```json
"engines": { "node": "22.x" }
```
- `.nvmrc`:
```text
22
```

## Required Vercel Project Settings

Set in Vercel UI:
- Root Directory: `apps/admin-web`
- Install Command: `corepack enable && pnpm install --frozen-lockfile`
- Build Command: `pnpm -w run build:vercel`
- Output Directory: `dist`
- Framework Preset: `Vite`
- Node.js Version: `22.x`

Note:
- Dashboard-only settings were not directly readable from local repository files.

## Validation (Executed Locally)

Commands run:
1. `CI=true pnpm install --frozen-lockfile`
2. `pnpm -w run build:vercel`
3. `pnpm -w run typecheck`
4. `pnpm -w run lint`

Results:
- `build:vercel`: success.
- `typecheck`: success.
- `lint`: success with pre-existing lint warnings (no errors).
- `npm warn Unknown env config` warnings: removed from these flows after pnpm migration.
- Remaining warning: Node engine mismatch warning only (because runtime was Node `26.0.0` in this environment).

## Optional Engine Strictness

Not enabled.

Reason:
- `engine-strict=true` can hard-fail installs on dependency engine mismatches.
- Enable only after confirming all direct/transitive dependencies are validated under Node 22 in CI/Vercel.

If desired later, add root `.npmrc`:
```ini
engine-strict=true
```

## Prevention Rules (Permanent)

1. Vercel build and workspace orchestration scripts must be pnpm-native.
2. Root engine must remain `22.x`.
3. Root `.nvmrc` must remain `22`.
4. Vercel must keep documented install/build/node settings.
5. Deployment logs must be reviewed for warning regression each release.

## Files Changed

- `package.json`
- `docs/repo-policy.md`
- `docs/vercel_deployment_warning_audit_2026-05-19.md`
