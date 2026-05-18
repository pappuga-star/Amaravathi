import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { globalSearchApi, GroupedSearchResults } from '../lib/globalSearchApi';

const RECENT_SEARCHES_KEY = 'amaravathi_recent_searches';

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  const addRecentSearch = (term: string) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...filtered].slice(0, 5); // Cache top 5 recent searches
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Keyboard shortcut listener Ctrl + K / Cmd + K and Escape
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
    queryKey: ['global-search-results', debouncedQuery],
    queryFn: () => globalSearchApi.search(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 5000,
  });

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    debouncedQuery,
    results: data?.results || { customers: [], savedBlends: [], customerTeaBlends: [], purchaseBatches: [], batchIngredients: [], suppliers: [], teaPowderTypes: [] },
    totalResults: data?.totalResults || 0,
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
