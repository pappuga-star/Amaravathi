export type SearchSortOrder = 'asc' | 'desc';

export interface SearchQueryInput {
  q?: unknown;
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  sortOrder?: unknown;
}

export interface NormalizedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  hasSearchTerm: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: SearchSortOrder;
}

export interface SearchPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface SearchListResponse<T> {
  items: T[];
  pagination: SearchPagination;
}

export interface SearchCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  delete(key: string): void;
  clearByPrefix(prefix: string): void;
  clearAll(): void;
  providerName?: 'memory' | 'redis' | 'hybrid';
  isRedisConnected?: () => boolean;
  size?: () => number;
}
