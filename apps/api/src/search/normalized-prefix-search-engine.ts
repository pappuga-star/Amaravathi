import type { SearchEngine, SearchPlanOptions } from './search-engine.js';
import { buildContainsRegex, buildPrefixRegex, normalizeSearchKey } from './search.utils.js';

export class NormalizedPrefixSearchEngine implements SearchEngine {
  buildPlan(options: SearchPlanOptions) {
    const queryKey = normalizeSearchKey(options.normalizedQuery);

    const orConditions = options.fields.flatMap((field) => {
      const prefixField = field.keyField ?? field.field;
      const prefixRegex = buildPrefixRegex(queryKey);

      if (options.mode === 'contains') {
        return [{ [prefixField]: buildContainsRegex(queryKey) }];
      }

      // Prefix-first strategy with contains fallback on original field
      return [{ [prefixField]: prefixRegex }, { [field.field]: buildContainsRegex(options.normalizedQuery) }];
    });

    return {
      engine: 'prefix' as const,
      fallbackUsed: false,
      normalizedQuery: queryKey,
      filter: { $or: orConditions },
    };
  }
}
