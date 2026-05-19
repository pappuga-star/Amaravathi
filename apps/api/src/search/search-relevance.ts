import { normalizeLanguageTerm } from './search-language.js';
import type { SearchResultItem } from './global-search.service.js';

export function applyBusinessRelevance(items: SearchResultItem[], query: string): SearchResultItem[] {
  const q = normalizeLanguageTerm(query);
  const isCode = /^[a-z]{1,4}[-\s]?\d+/i.test(query.trim());

  return [...items].sort((a, b) => {
    const aNorm = normalizeLanguageTerm(a.label);
    const bNorm = normalizeLanguageTerm(b.label);

    const aExact = aNorm === q ? 3 : aNorm.startsWith(q) ? 2 : aNorm.includes(q) ? 1 : 0;
    const bExact = bNorm === q ? 3 : bNorm.startsWith(q) ? 2 : bNorm.includes(q) ? 1 : 0;

    const aCodeBoost = isCode && /batch|formula|code/i.test(a.type) ? 1 : 0;
    const bCodeBoost = isCode && /batch|formula|code/i.test(b.type) ? 1 : 0;

    return bExact + bCodeBoost - (aExact + aCodeBoost);
  });
}
