import type { Request, Response } from 'express';
import { Customer } from '../models/Customer.js';
import { searchCache } from './search.cache.js';
import { benchmarkSearchEngines } from './search-benchmark.js';
import { getSearchAlerts, setLatestBenchmark } from './search-alerts.js';
import { getSearchHealth } from './search-health.js';
import { runSearchIndexAudit } from './search-index-audit.js';
import { searchMetrics } from './search-metrics.js';

export const searchAdminController = {
  async health(_req: Request, res: Response) {
    const health = await getSearchHealth();
    return res.json({ success: true, data: health });
  },

  metrics(_req: Request, res: Response) {
    return res.json({ success: true, data: searchMetrics.getSnapshot() });
  },

  clearCache(_req: Request, res: Response) {
    searchCache.clearAll();
    return res.json({ success: true, message: 'Search cache cleared.' });
  },

  async indexAudit(_req: Request, res: Response) {
    const result = await runSearchIndexAudit();
    return res.json({ success: true, data: result });
  },

  async runBenchmark(req: Request, res: Response) {
    const query = String(req.body?.query ?? 'tea').trim();
    const iterations = Number(req.body?.iterations ?? 20);
    const result = await benchmarkSearchEngines({
      model: Customer,
      query,
      iterations,
      fields: [
        { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
        { field: 'mobileNumber', category: 'code' },
        { field: 'address', category: 'text' },
      ],
    });
    setLatestBenchmark(result);
    return res.json({ success: true, data: result });
  },

  async alerts(_req: Request, res: Response) {
    const alerts = await getSearchAlerts();
    return res.json({ success: true, data: alerts });
  },
};
