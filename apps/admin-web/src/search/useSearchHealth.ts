import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type SearchHealth = {
  cacheProvider: string;
  cacheSize: number;
  cacheHitRatioPct: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  slowQueryCount: number;
  invalidationCount: number;
  activeSearchEngine: string;
  redisConnected: boolean;
};

export function useSearchHealth() {
  return useQuery({
    queryKey: ['search-admin', 'health'],
    queryFn: () => api<SearchHealth>('/search-admin/health'),
    refetchInterval: 15_000,
  });
}
