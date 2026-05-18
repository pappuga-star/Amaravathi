import { api } from './api';

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
}

export const globalSearchApi = {
  async search(query: string): Promise<SearchResponse> {
    if (!query || query.trim().length < 2) {
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
