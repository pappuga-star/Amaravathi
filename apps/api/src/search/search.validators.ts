import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_CHARS,
} from './search.constants.js';
import type {
  NormalizedSearchQuery,
  SearchQueryInput,
  SearchSortOrder,
} from './search.types.js';
import { buildPagination, clampLimit, normalizeQuery, normalizeSortOrder } from './search.utils.js';

export class SearchValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = 'SEARCH_VALIDATION_ERROR', status = 422) {
    super(message);
    this.name = 'SearchValidationError';
    this.code = code;
    this.status = status;
  }
}

export function validateSearchQuery(
  input: SearchQueryInput,
  options?: {
    minChars?: number;
    maxQueryLength?: number;
    allowedSortBy?: string[];
    defaultSortBy?: string;
    maxLimit?: number;
  },
): NormalizedSearchQuery {
  const minChars = options?.minChars ?? SEARCH_MIN_CHARS;
  const maxQueryLength = options?.maxQueryLength ?? SEARCH_MAX_QUERY_LENGTH;
  const normalizedQuery = normalizeQuery(input.q);

  if (normalizedQuery.length > maxQueryLength) {
    throw new SearchValidationError(
      `Search query cannot exceed ${maxQueryLength} characters.`,
      'SEARCH_QUERY_TOO_LONG',
    );
  }

  const hasSearchTerm = normalizedQuery.length > 0;
  if (hasSearchTerm && normalizedQuery.length < minChars) {
    throw new SearchValidationError(
      `Search query must be at least ${minChars} characters.`,
      'SEARCH_QUERY_TOO_SHORT',
      400,
    );
  }

  const { page, limit } = buildPagination(input.page, input.limit, options?.maxLimit);
  const sortByRaw = normalizeQuery(input.sortBy);
  const sortBy = sortByRaw || options?.defaultSortBy || 'createdAt';
  if (options?.allowedSortBy?.length && !options.allowedSortBy.includes(sortBy)) {
    throw new SearchValidationError(
      `Invalid sortBy value. Allowed: ${options.allowedSortBy.join(', ')}.`,
      'SEARCH_INVALID_SORT_BY',
      400,
    );
  }

  const sortOrder = normalizeSortOrder(input.sortOrder) as SearchSortOrder;

  return {
    rawQuery: typeof input.q === 'string' ? input.q : '',
    normalizedQuery,
    hasSearchTerm,
    page,
    limit: clampLimit(limit ?? SEARCH_DEFAULT_LIMIT, options?.maxLimit),
    sortBy,
    sortOrder,
  };
}
