import type { FilterQuery } from 'mongoose';
import { env } from '../config/env.js';
import type { SearchEngine, SearchOptions, SearchPlanOptions, SearchResult } from './search-engine.js';
import { RegexSearchEngine } from './regex-search-engine.js';

function isAtlasSearchSupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('$search') || message.includes('Atlas Search') || message.includes('Unrecognized pipeline stage name');
}

export class AtlasSearchEngine implements SearchEngine {
  private readonly regexFallback = new RegexSearchEngine();

  buildPlan(options: SearchPlanOptions) {
    // Atlas plans are executed through aggregate in `search`; plan fallback is regex.
    const fallback = this.regexFallback.buildPlan(options);
    return {
      ...fallback,
      engine: 'atlas' as const,
      fallbackUsed: true,
    };
  }

  async search<T = any>(options: SearchOptions<T>): Promise<SearchResult<T>> {
    const shouldFallback = env.searchEnableAtlasFallback;
    const indexName = env.searchAtlasIndexName;

    const compoundShould = options.fields.map((field) => ({
      text: {
        path: field.field,
        query: options.normalizedQuery,
        score: {
          boost: { value: field.weight ?? 1 },
        },
      },
    }));

    const pipeline: any[] = [
      {
        $search: {
          index: indexName,
          compound: {
            should: compoundShould,
            minimumShouldMatch: 1,
          },
        },
      },
    ];

    if (options.baseFilter && Object.keys(options.baseFilter as Record<string, unknown>).length > 0) {
      pipeline.push({ $match: options.baseFilter as FilterQuery<T> });
    }

    if (options.projection) pipeline.push({ $project: options.projection });

    pipeline.push({ $limit: options.limit ?? 20 });

    try {
      const items = await options.model.aggregate(pipeline);
      return {
        items,
        engine: 'atlas',
        fallbackUsed: false,
      };
    } catch (error) {
      if (!shouldFallback || !isAtlasSearchSupportedError(error)) {
        throw error;
      }

      const fallbackPlan = this.regexFallback.buildPlan({
        normalizedQuery: options.normalizedQuery,
        fields: options.fields,
        ...(options.mode ? { mode: options.mode } : {}),
      });

      const items = await options.model
        .find(
          {
            ...(options.baseFilter ?? {}),
            ...(fallbackPlan.filter ?? {}),
          } as FilterQuery<T>,
          options.projection,
        )
        .sort(options.sort ?? {})
        .limit(options.limit ?? 20)
        .lean();

      return {
        items: items as unknown as T[],
        engine: 'atlas',
        fallbackUsed: true,
      };
    }
  }
}
