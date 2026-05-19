import type { SearchEngine, SearchPlanOptions } from './search-engine.js';
import { buildContainsRegex } from './search.utils.js';

export class RegexSearchEngine implements SearchEngine {
  buildPlan(options: SearchPlanOptions) {
    const regex = buildContainsRegex(options.normalizedQuery);
    return {
      engine: 'regex' as const,
      fallbackUsed: false,
      normalizedQuery: options.normalizedQuery,
      filter: {
        $or: options.fields.map((field) => ({ [field.field]: regex })),
      },
    };
  }
}
