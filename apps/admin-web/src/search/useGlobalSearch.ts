import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../hooks/useDebounce';
import { globalSearchApi } from '../lib/globalSearchApi';
import {
  GLOBAL_SEARCH_STALE_TIME_MS,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
} from './search.constants';
import { searchKeys } from './search-query-keys';
import { useSearchSuggestions } from './useSearchSuggestions';

const RECENT_SEARCHES_KEY = 'amaravathi_recent_searches';

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  const addRecentSearch = (term: string) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data, isFetching, error } = useQuery({
    queryKey: searchKeys.global(debouncedQuery),
    queryFn: () => globalSearchApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length >= SEARCH_MIN_CHARS,
    staleTime: GLOBAL_SEARCH_STALE_TIME_MS,
  });
  const suggestionsQuery = useSearchSuggestions(debouncedQuery);

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    debouncedQuery,
    results: data?.results || { customers: [], savedBlends: [], customerTeaBlends: [], purchaseBatches: [], generalItems: [], batchIngredients: [], suppliers: [], teaPowderTypes: [] },
    totalResults: data?.totalResults || 0,
    quality: data?.quality,
    suggestions: suggestionsQuery.data ?? data?.quality?.suggestions ?? [],
    isLoading: isFetching,
    error,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    toggle: () => setIsOpen((prev) => !prev),
    open: () => setIsOpen(true),
    close: () => {
      setIsOpen(false);
      setQuery('');
    },
  };
}
