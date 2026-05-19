# Accessibility Guidelines

## Icon-Only Button Standard
All icon-only controls must use an approved wrapper component:
- `AccessibleIconButton`
- `TooltipIconButton`
- `IconButtonWithTooltip`

Do not introduce new raw icon-only `<button>` or icon-only shared `<Button>` usages.

## Required Behavior
Approved wrappers must provide all of the following from one source label:
- `aria-label`
- `title`
- Tooltip content

Example:

```tsx
<AccessibleIconButton label="Edit Customer" className="h-8 w-8">
  <Pencil className="h-4 w-4" />
</AccessibleIconButton>
```

## Exception Process
Only use exceptions when a third-party component cannot be wrapped directly.

Requirements for exception:
1. Add inline comment before the button:
```tsx
// accessibility-exception: third-party component limitation
```
2. Provide explicit `aria-label` and `title`.
3. Provide tooltip behavior via the third-party API or local fallback.

## Enforcement
The repository enforces this standard through:
1. ESLint custom rule: `accessibility/no-raw-icon-only-buttons`
2. Audit script: `npm run a11y:icon-buttons`

Both run in CI quality gates via `npm run quality:pr`.
