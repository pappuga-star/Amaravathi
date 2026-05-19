#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

function rg(pattern: string, glob: string) {
  try {
    const out = execSync(`rg -n --glob '${glob}' \"${pattern}\" apps scripts`, { encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const violations: string[] = [];

for (const line of rg('useDebounce\\(', '*.tsx')) {
  if (!line.includes('src/search/')) violations.push(`useDebounce outside search scope: ${line}`);
}
for (const line of rg('debounce\\(\\s*\\d+', '*.{ts,tsx}')) {
  violations.push(`Hardcoded debounce value: ${line}`);
}
for (const line of rg('queryKey:\\s*\\[[^\]]*search[^\]]*\\]', '*.tsx')) {
  if (!line.includes('search-query-keys.ts')) violations.push(`Potential hardcoded search query key: ${line}`);
}
for (const line of rg('AutocompleteSearchInput', '*.tsx')) {
  if (!line.includes('src/search/')) violations.push(`Duplicate/autocomplete usage outside search module: ${line}`);
}
for (const line of rg('searchCache\\.(get|set|delete|clearByPrefix|clearAll)', '*.{ts,tsx}')) {
  if (!line.includes('/src/search/') || line.includes('global-search.service.ts')) continue;
  violations.push(`Direct search cache access outside allowed flow: ${line}`);
}

const policy = readFileSync(join(process.cwd(), 'docs', 'repo-policy.md'), 'utf8');
if (!policy.toLowerCase().includes('search')) {
  violations.push('docs/repo-policy.md missing explicit search policy references.');
}

if (violations.length > 0) {
  console.error('Search SSOT verification failed:\n');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}

console.log('Search SSOT verification passed.');
