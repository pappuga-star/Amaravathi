export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) {
    const row = dp[i];
    if (row) row[0] = i;
  }
  const firstRow = dp[0];
  if (firstRow) {
    for (let j = 0; j <= n; j += 1) firstRow[j] = j;
  }
  for (let i = 1; i <= m; i += 1) {
    const row = dp[i];
    const prev = dp[i - 1];
    if (!row || !prev) continue;
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const a1 = prev[j] ?? Number.MAX_SAFE_INTEGER;
      const a2 = row[j - 1] ?? Number.MAX_SAFE_INTEGER;
      const a3 = prev[j - 1] ?? Number.MAX_SAFE_INTEGER;
      row[j] = Math.min(a1 + 1, a2 + 1, a3 + cost);
    }
  }
  return dp[m]?.[n] ?? Math.max(m, n);
}

export function fuzzyThreshold(query: string): number {
  if (query.length <= 4) return 1;
  return 2;
}

export function findClosestTerm(query: string, candidates: string[]): string | null {
  const threshold = fuzzyThreshold(query);
  let best: { term: string; dist: number } | null = null;
  for (const c of candidates) {
    const dist = levenshtein(query, c);
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { term: c, dist };
    }
  }
  return best?.term ?? null;
}
