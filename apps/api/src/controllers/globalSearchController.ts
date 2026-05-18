import type { Request, Response } from 'express';
import { globalSearchService } from '../services/globalSearchService.js';

export const globalSearchController = {
  async search(req: Request, res: Response) {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      if (!q.trim() || q.trim().length < 2) {
        return res.json({
          success: true,
          data: {
            query: q,
            results: {
              customers: [],
              savedBlends: [],
              customerTeaBlends: [],
              purchaseBatches: [],
              generalItems: [],
              batchIngredients: [],
              teaPowderTypes: [],
              suppliers: [],
            },
            totalResults: 0,
          },
        });
      }

      const userRole = req.user?.role || 'viewer';
      const results = await globalSearchService.search(q, userRole);

      const totalResults = Object.values(results).reduce((acc: number, curr: any) => acc + curr.length, 0);

      return res.json({
        success: true,
        data: {
          query: q,
          results,
          totalResults,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Global search failed.',
      });
    }
  },
};
