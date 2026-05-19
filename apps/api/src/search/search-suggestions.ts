import { getPopularTerms } from './search-analytics.js';
import { normalizeLanguageTerm } from './search-language.js';
import type { SearchSuggestion } from './search-quality.types.js';

export function buildSuggestions(query: string, entityLabels: string[], limit = 10): SearchSuggestion[] {
  const normalized = normalizeLanguageTerm(query);
  if (!normalized) return [];
  const suggestions = new Map<string, SearchSuggestion>();

  for (const label of entityLabels) {
    const labelNorm = normalizeLanguageTerm(label);
    if (!labelNorm) continue;
    if (labelNorm.startsWith(normalized) || labelNorm.includes(normalized)) {
      suggestions.set(label, { text: label, type: 'entity' });
      if (suggestions.size >= limit) break;
    }
  }

  if (suggestions.size < limit) {
    for (const term of getPopularTerms(limit)) {
      if (term.startsWith(normalized) || term.includes(normalized)) {
        suggestions.set(term, { text: term, type: 'popular' });
      }
      if (suggestions.size >= limit) break;
    }
  }

  return [...suggestions.values()].slice(0, limit);
}
