# Repository Policy

This document defines the minimum engineering gates for pull requests.

## Branches

- Protected branches: `main`, `develop`, `staging`
- All changes to protected branches must come through PRs.

## Required PR Checks

The GitHub Actions workflow `PR Quality Gates` runs on every PR to protected branches and must pass:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run dead-code:ci`
4. `npm run duplicates:ci`

Combined command:

```bash
npm run quality:pr
```

## Code Quality Rules

1. Do not add temporary scripts under tracked app source directories.
2. Keep one canonical schema/contract path; avoid parallel legacy payload shapes.
3. Keep generated artifacts in canonical folders only (no duplicate copies).
4. If compatibility code is needed, create a migration ticket and removal deadline in the same PR.

## Local Pre-PR Checklist

Before opening a PR:

```bash
npm ci
npm run quality:pr
```

## CI Baseline Notes

- `knip.json` contains explicit ignores for approved one-off operational files.
- Duplicate threshold in CI is set to `5.3%` to prevent regression while existing duplication is being reduced incrementally.
