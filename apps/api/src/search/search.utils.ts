import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_DEFAULT_PAGE,
  SEARCH_MAX_LIMIT,
} from './search.constants.js';
import type { SearchListResponse, SearchPagination, SearchSortOrder } from './search.types.js';

export function normalizeQuery(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeSearchKey(value: unknown): string {
  return normalizeQuery(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegex(value: string): string {
  return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function buildContainsRegex(query: string): RegExp {
  return new RegExp(escapeRegex(query), 'i');
}

export function buildPrefixRegex(query: string): RegExp {
  return new RegExp(`^${escapeRegex(query)}`, 'i');
}

export function clampLimit(limit: unknown): number {
  const parsed = Number(limit ?? SEARCH_DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return SEARCH_DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), SEARCH_MAX_LIMIT);
}

export function buildPagination(
  pageInput: unknown,
  limitInput: unknown,
): { page: number; limit: number; skip: number } {
  const parsedPage = Number(pageInput ?? SEARCH_DEFAULT_PAGE);
  const page = Number.isFinite(parsedPage)
    ? Math.max(Math.floor(parsedPage), 1)
    : SEARCH_DEFAULT_PAGE;
  const limit = clampLimit(limitInput);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildSearchCacheKey(
  namespace: string,
  data: Record<string, unknown>,
): string {
  const normalized = Object.keys(data)
    .sort()
    .map((key) => `${key}:${String(data[key] ?? '')}`)
    .join('|');
  return `${namespace}::${normalized}`;
}

export function buildSearchResponse<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number,
): SearchListResponse<T> {
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
  const pagination: SearchPagination = { page, limit, totalItems, totalPages };
  return {
    items,
    pagination,
  };
}

export function normalizeSortOrder(value: unknown): SearchSortOrder {
  return String(value ?? 'asc').trim().toLowerCase() === 'desc'
    ? 'desc'
    : 'asc';
}
