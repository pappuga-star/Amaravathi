import { normalizeLanguageTerm } from './search-language.js';

const BASE_SYNONYMS: Record<string, string[]> = {
  supplier: ['seller'],
  seller: ['supplier'],
  formula: ['blend'],
  blend: ['formula'],
  batch: ['lot'],
  lot: ['batch'],
  tea: ['powder'],
  powder: ['tea'],
  kg: ['kilogram'],
  kilogram: ['kg'],
};

export function expandSynonyms(query: string): string[] {
  const normalized = normalizeLanguageTerm(query);
  if (!normalized) return [];

  const tokens = normalized.split(' ');
  const variants = new Set<string>([normalized]);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const syns = BASE_SYNONYMS[token] ?? [];
    for (const syn of syns) {
      const copy = [...tokens];
      copy[i] = syn;
      variants.add(copy.join(' '));
    }
  }

  return [...variants];
}
