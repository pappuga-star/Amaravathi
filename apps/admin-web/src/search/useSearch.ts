import { useEffect, useMemo, useState } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_GC_TIME_MS,
  SEARCH_STALE_TIME_MS,
} from './search.constants';
import { searchKeys } from './search-query-keys';
import type { SearchResponse } from './search.types';

type UseSearchOptions<T> = {
  moduleName: string;
  queryFn: (params: { q: string; page: number; limit: number }) => Promise<SearchResponse<T>>;
  initialPage?: number;
  initialLimit?: number;
  debounceMs?: number;
  syncUrl?: boolean;
  enabled?: boolean;
};

export function useSearch<T>({
  moduleName,
  queryFn,
  initialPage = 1,
  initialLimit = SEARCH_DEFAULT_LIMIT,
  debounceMs = SEARCH_DEBOUNCE_MS,
  syncUrl = true,
  enabled = true,
}: UseSearchOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(syncUrl ? searchParams.get('q') || '' : '');
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const debouncedQ = useDebounce(q, debounceMs);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  useEffect(() => {
    if (!syncUrl) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [debouncedQ, setSearchParams, searchParams, syncUrl]);

  const queryKey = useMemo(
    () =>
      searchKeys.module(moduleName, {
        q: debouncedQ.trim(),
        page,
        limit,
      }),
    [moduleName, debouncedQ, page, limit],
  );

  const query = useQuery({
    queryKey,
    queryFn: () =>
      queryFn({
        q: debouncedQ.trim(),
        page,
        limit,
      }),
    enabled,
    staleTime: SEARCH_STALE_TIME_MS,
    gcTime: SEARCH_GC_TIME_MS,
  } as UseQueryOptions<SearchResponse<T>>);

  return {
    q,
    setQ,
    debouncedQ,
    page,
    setPage,
    limit,
    setLimit,
    query,
  };
}
