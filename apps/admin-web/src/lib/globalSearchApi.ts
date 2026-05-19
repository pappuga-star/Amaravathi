import { api } from './api';
import { SEARCH_MIN_CHARS } from '../search/search.constants';

export interface SearchResultItem {
  _id: string;
  label: string;
  type: string;
  subtitle: string;
  route: string;
}

export interface GroupedSearchResults {
  customers: SearchResultItem[];
  savedBlends: SearchResultItem[];
  customerTeaBlends: SearchResultItem[];
  purchaseBatches: SearchResultItem[];
  generalItems: SearchResultItem[];
  batchIngredients: SearchResultItem[];
  teaPowderTypes: SearchResultItem[];
  suppliers: SearchResultItem[];
}

export interface SearchResponse {
  query: string;
  results: GroupedSearchResults;
  totalResults: number;
  quality?: {
    expandedTerms?: string[];
    correctedQuery?: string;
    suggestions?: Array<{ text: string; type: 'completion' | 'popular' | 'entity' }>;
    zeroResultRecoveryApplied?: boolean;
  };
}

export const globalSearchApi = {
  async search(query: string): Promise<SearchResponse> {
    if (!query || query.trim().length < SEARCH_MIN_CHARS) {
      return { 
        query, 
        results: { customers: [], savedBlends: [], customerTeaBlends: [], purchaseBatches: [], generalItems: [], batchIngredients: [], suppliers: [], teaPowderTypes: [] },
        totalResults: 0 
      };
    }
    const data = await api<SearchResponse>(`/global-search?q=${encodeURIComponent(query.trim())}`);
    return data;
  },
};
