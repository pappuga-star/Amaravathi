import type { RankedSearchField } from './search-engine.js';
import { normalizeSearchKey } from './search.utils.js';

export const DEFAULT_SEARCH_WEIGHTS = {
  exactCode: 100,
  prefixCode: 80,
  exactName: 70,
  prefixName: 60,
  containsName: 30,
  textContains: 10,
} as const;

function asString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function valueAtPath(doc: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = doc;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function computeFieldScore(field: RankedSearchField, queryKey: string, rawValue: unknown): number {
  if (rawValue == null) return 0;

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  let maxScore = 0;

  for (const value of values) {
    const valueKey = normalizeSearchKey(asString(value));
    if (!valueKey) continue;

    let score = 0;
    if (field.category === 'code') {
      if (valueKey === queryKey) score = DEFAULT_SEARCH_WEIGHTS.exactCode;
      else if (valueKey.startsWith(queryKey)) score = DEFAULT_SEARCH_WEIGHTS.prefixCode;
    } else if (field.category === 'name') {
      if (valueKey === queryKey) score = DEFAULT_SEARCH_WEIGHTS.exactName;
      else if (valueKey.startsWith(queryKey)) score = DEFAULT_SEARCH_WEIGHTS.prefixName;
      else if (valueKey.includes(queryKey)) score = DEFAULT_SEARCH_WEIGHTS.containsName;
    } else {
      if (valueKey.includes(queryKey)) score = DEFAULT_SEARCH_WEIGHTS.textContains;
    }

    const weightedScore = field.weight ? score * field.weight : score;
    if (weightedScore > maxScore) maxScore = weightedScore;
  }

  return maxScore;
}

export function rankSearchResults<T extends Record<string, unknown>>(
  docs: T[],
  query: string,
  fields: RankedSearchField[],
): T[] {
  const queryKey = normalizeSearchKey(query);
  if (!queryKey) return docs;

  return docs
    .map((doc, index) => {
      const score = fields.reduce((sum, field) => {
        const rawValue = valueAtPath(doc, field.field);
        return sum + computeFieldScore(field, queryKey, rawValue);
      }, 0);
      return { doc, score, index };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((item) => item.doc);
}
