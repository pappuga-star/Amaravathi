import type { FilterQuery, Model, ProjectionType } from 'mongoose';
import { performance } from 'node:perf_hooks';
import { SEARCH_CACHE_TTL_SECONDS } from './search.constants.js';
import { searchCache } from './search.cache.js';
import { SEARCH_CACHE_PREFIXES } from './search.events.js';
import { getSearchEngine } from './search-engine-factory.js';
import type { RankedSearchField } from './search-engine.js';
import { recordSearchProfile } from './search-profiler.js';
import { rankSearchResults } from './search-ranking.js';
import type { SearchListResponse } from './search.types.js';
import { buildSearchCacheKey, buildSearchResponse } from './search.utils.js';
import { validateSearchQuery } from './search.validators.js';

type SearchListOptions<T> = {
  namespace: string;
  model: Model<any>;
  query: {
    q?: unknown;
    page?: unknown;
    limit?: unknown;
    sortBy?: unknown;
    sortOrder?: unknown;
  };
  buildFilter: (normalizedQuery: string) => FilterQuery<T>;
  searchFields?: RankedSearchField[];
  searchMode?: 'contains' | 'prefix';
  rankResults?: boolean;
  baseFilter?: FilterQuery<T>;
  projection?: ProjectionType<T>;
  allowedSortBy?: string[];
  defaultSortBy?: string;
  transformItem?: (item: any) => any;
  useEstimatedCountWhenNoFilter?: boolean;
  cacheTtlSeconds?: number;
};

export async function runListSearch<T>(
  options: SearchListOptions<T>,
): Promise<
  SearchListResponse<any> & {
    total: number;
    page: number;
    limit: number;
  }
> {
  const startedAt = performance.now();
  const validatorOptions: {
    allowedSortBy?: string[];
    defaultSortBy?: string;
  } = {};
  if (options.allowedSortBy) validatorOptions.allowedSortBy = options.allowedSortBy;
  if (options.defaultSortBy) validatorOptions.defaultSortBy = options.defaultSortBy;
  const normalized = validateSearchQuery(options.query, validatorOptions);

  const filter: FilterQuery<T> = {
    ...(options.baseFilter ?? {}),
    ...(normalized.hasSearchTerm
      ? options.searchFields?.length
        ? getSearchEngine().buildPlan({
            normalizedQuery: normalized.normalizedQuery,
            fields: options.searchFields,
            mode: options.searchMode ?? 'prefix',
          }).filter
        : options.buildFilter(normalized.normalizedQuery)
      : {}),
  } as FilterQuery<T>;

  const sortValue = normalized.sortOrder === 'desc' ? -1 : 1;
  const sortConfig: Record<string, 1 | -1> = {
    [normalized.sortBy]: sortValue as 1 | -1,
  };

  const cacheKey = buildSearchCacheKey(
    `${SEARCH_CACHE_PREFIXES.list}:${options.namespace}`,
    {
      q: normalized.normalizedQuery.toLowerCase(),
      page: normalized.page,
      limit: normalized.limit,
      sortBy: normalized.sortBy,
      sortOrder: normalized.sortOrder,
      filter: JSON.stringify(filter),
    },
  );
  const cached = searchCache.get<
    SearchListResponse<any> & { total: number; page: number; limit: number }
  >(cacheKey);
  if (cached) {
    recordSearchProfile({
      module: options.namespace,
      normalizedQuery: normalized.normalizedQuery,
      executionTimeMs: performance.now() - startedAt,
      resultCount: cached.items.length,
      cacheHit: true,
      engine: 'cache',
    });
    return cached;
  }

  const skip = (normalized.page - 1) * normalized.limit;
  const queryBuilder = options.model
    .find(filter, options.projection)
    .sort(sortConfig)
    .skip(skip)
    .limit(normalized.limit)
    .lean();

  const hasFilter = Object.keys(filter as Record<string, unknown>).length > 0;
  const [itemsRaw, total] = await Promise.all([
    queryBuilder,
    options.useEstimatedCountWhenNoFilter && !hasFilter
      ? options.model.estimatedDocumentCount()
      : options.model.countDocuments(filter),
  ]);

  const rankedItems =
    normalized.hasSearchTerm && options.searchFields?.length && options.rankResults !== false
      ? rankSearchResults(itemsRaw as Record<string, unknown>[], normalized.normalizedQuery, options.searchFields)
      : itemsRaw;
  const items = options.transformItem
    ? rankedItems.map(options.transformItem)
    : rankedItems;
  const response = buildSearchResponse(items, normalized.page, normalized.limit, total);
  const payload = {
    ...response,
    total,
    page: normalized.page,
    limit: normalized.limit,
  };

  searchCache.set(cacheKey, payload, options.cacheTtlSeconds ?? SEARCH_CACHE_TTL_SECONDS);
  recordSearchProfile({
    module: options.namespace,
    normalizedQuery: normalized.normalizedQuery,
    executionTimeMs: performance.now() - startedAt,
    resultCount: items.length,
    cacheHit: false,
    engine: options.searchFields?.length ? 'engine' : 'legacy-filter',
  });
  return payload;
}
