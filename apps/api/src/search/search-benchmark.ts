import { performance } from 'node:perf_hooks';
import type { Model } from 'mongoose';
import { createSearchEngine } from './search-engine-factory.js';
import type { RankedSearchField } from './search-engine.js';

export type BenchmarkRun = {
  engine: string;
  coldMs: number;
  warmMs: number;
  throughputPerSec: number;
};

export async function benchmarkSearchEngines(options: {
  model: Model<any>;
  query: string;
  fields: RankedSearchField[];
  iterations?: number;
}): Promise<BenchmarkRun[]> {
  const iterations = Math.max(5, options.iterations ?? 20);
  const engines: Array<'regex' | 'prefix' | 'atlas'> = ['regex', 'prefix', 'atlas'];
  const results: BenchmarkRun[] = [];

  for (const engineName of engines) {
    process.env.SEARCH_ENGINE = engineName;
    const engine = createSearchEngine();

    const coldStart = performance.now();
    if (engine.search) {
      await engine.search({
        model: options.model,
        normalizedQuery: options.query,
        fields: options.fields,
        limit: 20,
      });
    } else {
      const plan = engine.buildPlan({ normalizedQuery: options.query, fields: options.fields });
      await options.model.find(plan.filter).limit(20).lean();
    }
    const coldMs = performance.now() - coldStart;

    const warmStart = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      if (engine.search) {
        await engine.search({
          model: options.model,
          normalizedQuery: options.query,
          fields: options.fields,
          limit: 20,
        });
      } else {
        const plan = engine.buildPlan({ normalizedQuery: options.query, fields: options.fields });
        await options.model.find(plan.filter).limit(20).lean();
      }
    }
    const warmMsTotal = performance.now() - warmStart;

    results.push({
      engine: engineName,
      coldMs: Number(coldMs.toFixed(2)),
      warmMs: Number((warmMsTotal / iterations).toFixed(2)),
      throughputPerSec: Number((iterations / (warmMsTotal / 1000)).toFixed(2)),
    });
  }

  return results;
}
