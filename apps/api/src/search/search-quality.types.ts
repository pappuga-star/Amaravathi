import type { GroupedSearchResults } from './global-search.service.js';

export interface SearchSuggestion {
  text: string;
  type: 'completion' | 'popular' | 'entity';
}

export interface SearchQualityMeta {
  expandedTerms: string[];
  correctedQuery?: string;
  suggestions: SearchSuggestion[];
  zeroResultRecoveryApplied: boolean;
}

export interface SearchDetailedResult {
  query: string;
  results: GroupedSearchResults;
  totalResults: number;
  quality: SearchQualityMeta;
}
