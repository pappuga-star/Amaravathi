import { env } from '../config/env.js';
import type { SearchEngine } from './search-engine.js';
import { AtlasSearchEngine } from './atlas-search-engine.js';
import { NormalizedPrefixSearchEngine } from './normalized-prefix-search-engine.js';
import { RegexSearchEngine } from './regex-search-engine.js';

let cachedEngine: SearchEngine | null = null;

export function createSearchEngine(): SearchEngine {
  const configured = env.searchEngine;
  if (configured === 'atlas') return new AtlasSearchEngine();
  if (configured === 'prefix') return new NormalizedPrefixSearchEngine();
  return new RegexSearchEngine();
}

export function getSearchEngine(): SearchEngine {
  if (!cachedEngine) cachedEngine = createSearchEngine();
  return cachedEngine;
}

export function resetSearchEngineForTests(): void {
  cachedEngine = null;
}
