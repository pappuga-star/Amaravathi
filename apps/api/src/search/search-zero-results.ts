import { findClosestTerm } from './search-fuzzy.js';
import { getPopularTerms, trackCorrectedQuery } from './search-analytics.js';
import { normalizeLanguageTerm } from './search-language.js';

export function recoverFromZeroResults(query: string): { correctedQuery?: string; alternatives: string[] } {
  const normalized = normalizeLanguageTerm(query);
  const popular = getPopularTerms(100);
  const corrected = findClosestTerm(normalized, popular);
  if (corrected && corrected !== normalized) {
    trackCorrectedQuery(corrected);
  }
  const correctedQuery = corrected && corrected !== normalized ? corrected : null;
  return {
    ...(correctedQuery ? { correctedQuery } : {}),
    alternatives: popular.slice(0, 5),
  };
}
