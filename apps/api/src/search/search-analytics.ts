import { normalizeLanguageTerm } from './search-language.js';

const termCounts = new Map<string, number>();
const noResultCounts = new Map<string, number>();
const correctedCounts = new Map<string, number>();

export function trackSearchTerm(term: string, hadResults: boolean): void {
  const key = normalizeLanguageTerm(term);
  if (!key) return;
  termCounts.set(key, (termCounts.get(key) ?? 0) + 1);
  if (!hadResults) noResultCounts.set(key, (noResultCounts.get(key) ?? 0) + 1);
}

export function trackCorrectedQuery(corrected: string): void {
  const key = normalizeLanguageTerm(corrected);
  if (!key) return;
  correctedCounts.set(key, (correctedCounts.get(key) ?? 0) + 1);
}

export function getPopularTerms(limit = 10): string[] {
  return [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

export function getSearchQualityAnalytics(limit = 20) {
  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([term, count]) => ({ term, count }));
  return {
    popularTerms: top(termCounts),
    noResultTerms: top(noResultCounts),
    correctedTerms: top(correctedCounts),
  };
}
