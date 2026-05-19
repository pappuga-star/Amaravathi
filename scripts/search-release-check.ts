#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const requiredEnv = ['SEARCH_ENGINE', 'SEARCH_CACHE_PROVIDER', 'SEARCH_ENABLE_SYNONYMS', 'SEARCH_ENABLE_FUZZY'];
for (const key of requiredEnv) {
  if (!process.env[key]) fail(`Missing required env: ${key}`);
}

if (process.env.SEARCH_CACHE_PROVIDER === 'redis' && !process.env.REDIS_URL) {
  fail('REDIS_URL required when SEARCH_CACHE_PROVIDER=redis');
}

const requiredFiles = [
  'tests/search-quality-cases.json',
  'scripts/verify-search-ssot.ts',
  'scripts/search-benchmark-regression-check.ts',
];
for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`Missing required artifact: ${path}`);
}

try {
  execSync('node --version', { stdio: 'ignore' });
} catch {
  fail('Node runtime not available');
}

const qualityCases = JSON.parse(readFileSync('tests/search-quality-cases.json', 'utf8')) as Array<{ input: string; expected: string[] }>;
if (qualityCases.length < 5) fail('Insufficient search quality cases.');

console.log('Search release readiness checks passed.');
