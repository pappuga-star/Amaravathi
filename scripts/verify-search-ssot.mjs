import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function rg(pattern, glob) {
  try {
    const out = execSync(`rg -n --glob '${glob}' \"${pattern}\" apps scripts`, { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const violations = [];
const allowedCacheAccessOutsideSearch = [
  'apps/api/src/controllers/generalItemsController.ts',
];
for (const line of rg('useDebounce\\(', '*.tsx')) {
  if (!line.includes('src/search/')) violations.push(`useDebounce outside search scope: ${line}`);
}
for (const line of rg('debounce\\(\\s*\\d+', '*.{ts,tsx}')) violations.push(`Hardcoded debounce value: ${line}`);
for (const line of rg('queryKey:\\s*\\[[^\]]*(search|global)[^\]]*\\]', '*.tsx')) {
  if (!line.includes('/src/search/')) violations.push(`Potential hardcoded search query key outside search module: ${line}`);
}
for (const line of rg('function\\s+AutocompleteSearchInput\\s*\\(', '*.tsx')) {
  if (!line.includes('src/search/AutocompleteSearchInput.tsx')) violations.push(`Duplicate autocomplete component implementation: ${line}`);
}
for (const line of rg('searchCache\\.(get|set|delete|clearByPrefix|clearAll)', '*.{ts,tsx}')) {
  if (!line.includes('/src/search/')) {
    const allowed = allowedCacheAccessOutsideSearch.some((path) => line.includes(path));
    if (!allowed) violations.push(`Direct search cache access outside search module: ${line}`);
  }
}

const policy = readFileSync(join(process.cwd(), 'docs', 'repo-policy.md'), 'utf8');
if (!policy.toLowerCase().includes('search')) violations.push('docs/repo-policy.md missing explicit search policy references.');

if (violations.length) {
  console.error('Search SSOT verification failed:\n');
  violations.forEach((v) => console.error(`- ${v}`));
  process.exit(1);
}
console.log('Search SSOT verification passed.');
