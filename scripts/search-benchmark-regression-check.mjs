import { existsSync, readFileSync } from 'node:fs';

const baselinePath = process.env.SEARCH_BENCHMARK_BASELINE ?? 'artifacts/search-benchmark-baseline.json';
const currentPath = process.env.SEARCH_BENCHMARK_CURRENT ?? 'artifacts/search-benchmark-current.json';
const maxRegressionPct = Number(process.env.SEARCH_MAX_REGRESSION_PCT ?? 20);
const minHitRatio = Number(process.env.SEARCH_MIN_CACHE_HIT_RATIO_PCT ?? 70);

if (!existsSync(baselinePath) || !existsSync(currentPath)) {
  console.error(`Benchmark files missing. baseline=${baselinePath}, current=${currentPath}`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const current = JSON.parse(readFileSync(currentPath, 'utf8'));

if (baseline.warmMs <= 0 || current.warmMs <= 0) {
  console.error('Invalid benchmark warmMs values.');
  process.exit(1);
}

const regressionPct = ((current.warmMs - baseline.warmMs) / baseline.warmMs) * 100;
if (regressionPct > maxRegressionPct) {
  console.error(`Latency regression ${regressionPct.toFixed(2)}% exceeds ${maxRegressionPct}%`);
  process.exit(1);
}

if ((current.cacheHitRatioPct ?? 100) < minHitRatio) {
  console.error(`Cache hit ratio ${current.cacheHitRatioPct}% below threshold ${minHitRatio}%`);
  process.exit(1);
}

console.log(`Benchmark regression check passed (regression=${regressionPct.toFixed(2)}%).`);
