import type { SearchResultItem } from './global-search.service.js';

const userRecentQueries = new Map<string, string[]>();

export function trackUserSearch(userId: string, query: string): void {
  const current = userRecentQueries.get(userId) ?? [];
  const next = [query, ...current.filter((q) => q !== query)].slice(0, 20);
  userRecentQueries.set(userId, next);
}

export function personalizeResults(userId: string, items: SearchResultItem[]): SearchResultItem[] {
  const recent = userRecentQueries.get(userId) ?? [];
  if (!recent.length) return items;
  const recentSet = new Set(recent.map((q) => q.toLowerCase()));
  return [...items].sort((a, b) => {
    const aBoost = recentSet.has(a.label.toLowerCase()) ? 1 : 0;
    const bBoost = recentSet.has(b.label.toLowerCase()) ? 1 : 0;
    return bBoost - aBoost;
  });
}
