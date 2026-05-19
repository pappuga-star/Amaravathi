import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type SearchMetrics = {
  totalSearches: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatioPct: number;
  averageResponseTimeMs: number;
  p95LatencyMs: number;
  slowQueries: number;
  invalidationCount: number;
  searchErrors: number;
  topModules: Array<{ module: string; count: number }>;
  topSanitizedTerms: Array<{ term: string; count: number }>;
};

export function useSearchMetrics() {
  return useQuery({
    queryKey: ['search-admin', 'metrics'],
    queryFn: () => api<SearchMetrics>('/search-admin/metrics'),
    refetchInterval: 15_000,
  });
}
