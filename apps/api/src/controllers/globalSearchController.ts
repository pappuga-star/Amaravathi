import type { Request, Response } from 'express';
import { globalSearchService } from '../services/globalSearchService.js';
import { SEARCH_MIN_CHARS } from '../search/search.constants.js';
import { normalizeQuery } from '../search/search.utils.js';
import { SearchValidationError } from '../search/search.validators.js';
import { env } from '../config/env.js';
import { getSearchQualityAnalytics, trackSearchTerm } from '../search/search-analytics.js';
import { recoverFromZeroResults } from '../search/search-zero-results.js';
import { expandSynonyms } from '../search/search-synonyms.js';
import { buildSuggestions } from '../search/search-suggestions.js';
import { personalizeResults, trackUserSearch } from '../search/search-personalization.js';
import { applyBusinessRelevance } from '../search/search-relevance.js';
import type { GroupedSearchResults, SearchResultItem } from '../search/global-search.service.js';
import type { SearchDetailedResult } from '../search/search-quality.types.js';

function flattenResults(results: GroupedSearchResults): SearchResultItem[] {
  return [
    ...results.customers,
    ...results.savedBlends,
    ...results.customerTeaBlends,
    ...results.purchaseBatches,
    ...results.generalItems,
    ...results.batchIngredients,
    ...results.teaPowderTypes,
    ...results.suppliers,
  ];
}

function rehydrateResults(results: GroupedSearchResults, ranked: SearchResultItem[]): GroupedSearchResults {
  const byId = new Map(ranked.map((item) => [`${item.type}:${item._id}`, item]));
  const mapGroup = (items: SearchResultItem[]) =>
    items
      .map((item) => byId.get(`${item.type}:${item._id}`) ?? item)
      .sort((a, b) => ranked.findIndex((r) => r._id === a._id && r.type === a.type) - ranked.findIndex((r) => r._id === b._id && r.type === b.type));

  return {
    customers: mapGroup(results.customers),
    savedBlends: mapGroup(results.savedBlends),
    customerTeaBlends: mapGroup(results.customerTeaBlends),
    purchaseBatches: mapGroup(results.purchaseBatches),
    generalItems: mapGroup(results.generalItems),
    batchIngredients: mapGroup(results.batchIngredients),
    teaPowderTypes: mapGroup(results.teaPowderTypes),
    suppliers: mapGroup(results.suppliers),
  };
}

export const globalSearchController = {
  async search(req: Request, res: Response) {
    try {
      const q = normalizeQuery(req.query.q);
      if (!q || q.length < SEARCH_MIN_CHARS) {
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
      const userId = req.user?.id ?? 'anonymous';
      const expandedTerms = env.searchEnableSynonyms ? expandSynonyms(q) : [q];

      let results = await globalSearchService.search(expandedTerms[0] ?? q, userRole);
      let totalResults = Object.values(results).reduce((acc: number, curr: any[]) => acc + curr.length, 0);

      if (totalResults === 0 && expandedTerms.length > 1) {
        for (let i = 1; i < expandedTerms.length; i += 1) {
          const next = await globalSearchService.search(expandedTerms[i], userRole);
          const nextTotal = Object.values(next).reduce((acc: number, curr: any[]) => acc + curr.length, 0);
          if (nextTotal > 0) {
            results = next;
            totalResults = nextTotal;
            break;
          }
        }
      }

      const zeroRecovery = totalResults === 0 ? recoverFromZeroResults(q) : { alternatives: [] as string[] };
      if (totalResults === 0 && zeroRecovery.correctedQuery) {
        const recovered = await globalSearchService.search(zeroRecovery.correctedQuery, userRole);
        const recoveredTotal = Object.values(recovered).reduce((acc: number, curr: any[]) => acc + curr.length, 0);
        if (recoveredTotal > 0) {
          results = recovered;
          totalResults = recoveredTotal;
        }
      }

      let flat = flattenResults(results);
      flat = applyBusinessRelevance(flat, q);
      if (env.searchEnablePersonalization) {
        flat = personalizeResults(userId, flat);
      }
      const rankedResults = rehydrateResults(results, flat);
      const labels = flat.map((item) => item.label);
      const suggestions = buildSuggestions(q, labels, env.searchSuggestionLimit);

      trackUserSearch(userId, q);
      trackSearchTerm(q, totalResults > 0);

      const data: SearchDetailedResult = {
        query: q,
        results: rankedResults,
        totalResults,
        quality: {
          expandedTerms,
          ...(zeroRecovery.correctedQuery
            ? { correctedQuery: zeroRecovery.correctedQuery }
            : {}),
          suggestions,
          zeroResultRecoveryApplied: totalResults > 0 && !!zeroRecovery.correctedQuery,
        },
      };

      return res.json({
        success: true,
        data,
      });
    } catch (err: any) {
      const status = err instanceof SearchValidationError ? err.status : 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'Global search failed.',
        code: err instanceof SearchValidationError ? err.code : undefined,
      });
    }
  },
  async suggestions(req: Request, res: Response) {
    const q = normalizeQuery(req.query.q);
    if (!q || q.length < SEARCH_MIN_CHARS) return res.json({ success: true, data: [] });
    const userRole = req.user?.role || 'viewer';
    const results = await globalSearchService.search(q, userRole);
    const labels = flattenResults(results).map((item) => item.label);
    const suggestions = buildSuggestions(q, labels, env.searchSuggestionLimit);
    return res.json({ success: true, data: suggestions });
  },
  analytics(_req: Request, res: Response) {
    return res.json({ success: true, data: getSearchQualityAnalytics() });
  },
};
