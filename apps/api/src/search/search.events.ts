import { EventEmitter } from 'node:events';
import { searchCache } from './search.cache.js';
import { searchMetrics } from './search-metrics.js';

type SearchInvalidationEvent = {
  prefixes: string[];
  reason:
    | 'create'
    | 'update'
    | 'delete'
    | 'bulk-import'
    | 'restore'
    | 'stock-adjustment'
    | 'archive'
    | 'manual';
};

const emitter = new EventEmitter();

emitter.on('search:invalidate', (event: SearchInvalidationEvent) => {
  searchMetrics.recordInvalidation();
  for (const prefix of event.prefixes) {
    searchCache.clearByPrefix(prefix);
  }
});

export function invalidateSearchCaches(event: SearchInvalidationEvent): void {
  emitter.emit('search:invalidate', event);
}

export const SEARCH_CACHE_PREFIXES = {
  global: 'search:global',
  list: 'search:list',
  dropdown: 'search:dropdown',
  autocomplete: 'search:autocomplete',
  reports: 'search:reports',
} as const;
