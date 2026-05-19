import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SEARCH_MIN_CHARS } from './search.constants';

export type SearchSuggestion = { text: string; type: 'completion' | 'popular' | 'entity' };

export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['global-search-suggestions', query.trim().toLowerCase()],
    queryFn: () => api<SearchSuggestion[]>(`/global-search/suggestions?q=${encodeURIComponent(query.trim())}`),
    enabled: query.trim().length >= SEARCH_MIN_CHARS,
    staleTime: 15_000,
  });
}
