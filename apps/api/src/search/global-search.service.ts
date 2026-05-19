import { Customer } from '../models/Customer.js';
import { performance } from 'node:perf_hooks';
import { CustomerTeaFormula } from '../models/CustomerTeaFormula.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { GeneralItemPurchase } from '../models/GeneralItemPurchase.js';
import { Seller } from '../models/Seller.js';
import { TeaPowderType } from '../models/TeaPowderType.js';
import { searchCache } from './search.cache.js';
import { GLOBAL_SEARCH_LIMIT_PER_MODULE, SEARCH_CACHE_TTL_SECONDS } from './search.constants.js';
import { SEARCH_CACHE_PREFIXES } from './search.events.js';
import { getSearchEngine } from './search-engine-factory.js';
import { rankSearchResults } from './search-ranking.js';
import { buildContainsRegex, buildSearchCacheKey } from './search.utils.js';
import { validateSearchQuery } from './search.validators.js';
import { recordSearchProfile } from './search-profiler.js';

export interface SearchResultItem {
  _id: string;
  label: string;
  type: string;
  subtitle: string;
  route: string;
}

export interface GroupedSearchResults {
  customers: SearchResultItem[];
  savedBlends: SearchResultItem[];
  customerTeaBlends: SearchResultItem[];
  purchaseBatches: SearchResultItem[];
  generalItems: SearchResultItem[];
  batchIngredients: SearchResultItem[];
  teaPowderTypes: SearchResultItem[];
  suppliers: SearchResultItem[];
}

export const emptyGroupedResults: GroupedSearchResults = {
  customers: [],
  savedBlends: [],
  customerTeaBlends: [],
  purchaseBatches: [],
  generalItems: [],
  batchIngredients: [],
  teaPowderTypes: [],
  suppliers: [],
};

export const globalSearchService = {
  async search(queryInput: unknown, userRole: string): Promise<GroupedSearchResults> {
    const startedAt = performance.now();
    const normalized = validateSearchQuery(
      { q: queryInput, page: 1, limit: GLOBAL_SEARCH_LIMIT_PER_MODULE },
      { minChars: 2 },
    );
    if (!normalized.hasSearchTerm) return emptyGroupedResults;

    const cacheKey = buildSearchCacheKey(SEARCH_CACHE_PREFIXES.global, {
      role: userRole,
      q: normalized.normalizedQuery.toLowerCase(),
    });
    const cached = searchCache.get<GroupedSearchResults>(cacheKey);
    if (cached) {
      const total = Object.values(cached).reduce((sum, items) => sum + items.length, 0);
      recordSearchProfile({
        module: 'global-search',
        normalizedQuery: normalized.normalizedQuery,
        executionTimeMs: performance.now() - startedAt,
        resultCount: total,
        cacheHit: true,
        engine: 'cache',
      });
      return cached;
    }

    const engine = getSearchEngine();
    const isViewer = userRole === 'viewer';
    const limit = GLOBAL_SEARCH_LIMIT_PER_MODULE;

    const [formulasData, batchesData, generalItemsData, customersData, sellersData, inventoryData] =
      await Promise.all([
        engine.search
          ? engine.search({
              model: CustomerTeaFormula,
              normalizedQuery: normalized.normalizedQuery,
              fields: [
                { field: 'formulaCode', keyField: 'formulaCodeKey', category: 'code', weight: 1.4 },
                { field: 'notes', category: 'text', weight: 0.5 },
                { field: 'lineItems.ingredientName', category: 'name', weight: 0.9 },
              ],
              baseFilter: { deletedAt: null },
              projection: '_id formulaCode customerId notes lineItems',
              limit,
            })
          : Promise.resolve({
              items: await CustomerTeaFormula.find({
                deletedAt: null,
                ...(engine.buildPlan({
                  normalizedQuery: normalized.normalizedQuery,
                  fields: [
                    { field: 'formulaCode', keyField: 'formulaCodeKey', category: 'code', weight: 1.4 },
                    { field: 'notes', category: 'text', weight: 0.5 },
                    { field: 'lineItems.ingredientName', category: 'name', weight: 0.9 },
                  ],
                  mode: 'prefix',
                }).filter as any),
              })
                .select('_id formulaCode customerId notes lineItems')
                .limit(limit)
                .lean(),
              engine: 'regex' as const,
              fallbackUsed: false,
            }),

        engine.search
          ? engine.search({
              model: AddPurchaseBatch,
              normalizedQuery: normalized.normalizedQuery,
              fields: [
                { field: 'batchCode', keyField: 'batchCodeKey', category: 'code', weight: 1.5 },
                { field: 'sellerName', category: 'name' },
                { field: 'billNumber', category: 'code', weight: 1.1 },
                { field: 'lineItems.teaPowderTypeName', category: 'name', weight: 0.8 },
              ],
              projection: '_id batchCode sellerName billNumber numberOfBags lineItems',
              limit,
            })
          : Promise.resolve({
              items: await AddPurchaseBatch.find(
                engine.buildPlan({
                  normalizedQuery: normalized.normalizedQuery,
                  fields: [
                    { field: 'batchCode', keyField: 'batchCodeKey', category: 'code', weight: 1.5 },
                    { field: 'sellerName', category: 'name' },
                    { field: 'billNumber', category: 'code', weight: 1.1 },
                    { field: 'lineItems.teaPowderTypeName', category: 'name', weight: 0.8 },
                  ],
                  mode: 'prefix',
                }).filter,
              )
                .select('_id batchCode sellerName billNumber numberOfBags lineItems')
                .limit(limit)
                .lean(),
              engine: 'regex' as const,
              fallbackUsed: false,
            }),

        engine.search
          ? engine.search({
              model: GeneralItemPurchase,
              normalizedQuery: normalized.normalizedQuery,
              fields: [
                { field: 'supplierName', keyField: 'supplierNameKey', category: 'name', weight: 1.2 },
                { field: 'billNumber', category: 'code' },
                { field: 'lineItems.particulars', category: 'name', weight: 0.9 },
              ],
              baseFilter: { deletedAt: null },
              projection: '_id supplierName billNumber lineItems',
              limit,
            })
          : Promise.resolve({
              items: await GeneralItemPurchase.find({
                deletedAt: null,
                ...(engine.buildPlan({
                  normalizedQuery: normalized.normalizedQuery,
                  fields: [
                    { field: 'supplierName', keyField: 'supplierNameKey', category: 'name', weight: 1.2 },
                    { field: 'billNumber', category: 'code' },
                    { field: 'lineItems.particulars', category: 'name', weight: 0.9 },
                  ],
                  mode: 'prefix',
                }).filter as any),
              })
                .select('_id supplierName billNumber lineItems')
                .limit(limit)
                .lean(),
              engine: 'regex' as const,
              fallbackUsed: false,
            }),

        isViewer
          ? Promise.resolve({ items: [] })
          : (engine.search
              ? engine.search({
                  model: Customer,
                  normalizedQuery: normalized.normalizedQuery,
                  fields: [
                    { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
                    { field: 'mobileNumber', category: 'code' },
                    { field: 'address', category: 'text', weight: 0.6 },
                  ],
                  baseFilter: { deletedAt: null },
                  projection: '_id name mobileNumber address',
                  limit,
                })
              : Promise.resolve({
                  items: await Customer.find({
                    deletedAt: null,
                    ...(engine.buildPlan({
                      normalizedQuery: normalized.normalizedQuery,
                      fields: [
                        { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
                        { field: 'mobileNumber', category: 'code' },
                        { field: 'address', category: 'text', weight: 0.6 },
                      ],
                      mode: 'prefix',
                    }).filter as any),
                  })
                    .select('_id name mobileNumber address')
                    .limit(limit)
                    .lean(),
                })),

        isViewer
          ? Promise.resolve({ items: [] })
          : (engine.search
              ? engine.search({
                  model: Seller,
                  normalizedQuery: normalized.normalizedQuery,
                  fields: [
                    { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
                    { field: 'contactPerson', category: 'name' },
                    { field: 'phone', category: 'code' },
                    { field: 'email', category: 'text', weight: 0.7 },
                  ],
                  projection: '_id name contactPerson phone',
                  limit,
                })
              : Promise.resolve({
                  items: await Seller.find(
                    engine.buildPlan({
                      normalizedQuery: normalized.normalizedQuery,
                      fields: [
                        { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
                        { field: 'contactPerson', category: 'name' },
                        { field: 'phone', category: 'code' },
                        { field: 'email', category: 'text', weight: 0.7 },
                      ],
                      mode: 'prefix',
                    }).filter,
                  )
                    .select('_id name contactPerson phone')
                    .limit(limit)
                    .lean(),
                })),

        isViewer
          ? Promise.resolve({ items: [] })
          : (engine.search
              ? engine.search({
                  model: TeaPowderType,
                  normalizedQuery: normalized.normalizedQuery,
                  fields: [
                    { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
                    { field: 'description', category: 'text', weight: 0.7 },
                  ],
                  baseFilter: { active: true },
                  projection: '_id name description',
                  limit,
                })
              : Promise.resolve({
                  items: await TeaPowderType.find({
                    active: true,
                    ...(engine.buildPlan({
                      normalizedQuery: normalized.normalizedQuery,
                      fields: [
                        { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
                        { field: 'description', category: 'text', weight: 0.7 },
                      ],
                      mode: 'prefix',
                    }).filter as any),
                  })
                    .select('_id name description')
                    .limit(limit)
                    .lean(),
                })),
      ]);

    const formulasRanked = rankSearchResults(formulasData.items as any[], normalized.normalizedQuery, [
      { field: 'formulaCode', keyField: 'formulaCodeKey', category: 'code', weight: 1.4 },
      { field: 'lineItems.ingredientName', category: 'name', weight: 0.9 },
      { field: 'notes', category: 'text', weight: 0.5 },
    ]).slice(0, limit);

    const savedBlends = formulasRanked.map((f: any) => ({
      _id: `${f._id}-view`,
      label: f.formulaCode,
      type: 'savedBlend',
      subtitle: `Customer: ${f.customerId?.name || 'Unknown'} • Notes: ${f.notes || 'N/A'}`,
      route: `/taste-customization?tab=saved-formulas&viewId=${f._id}`,
    }));

    const customerTeaBlends = formulasRanked.map((f: any) => ({
      _id: `${f._id}-edit`,
      label: f.formulaCode,
      type: 'customerTeaBlend',
      subtitle: `Customer: ${f.customerId?.name || 'Unknown'} • Edit Blend`,
      route: `/customer-formulas/edit/${f._id}`,
    }));

    const purchaseBatches = rankSearchResults(batchesData.items as any[], normalized.normalizedQuery, [
      { field: 'batchCode', keyField: 'batchCodeKey', category: 'code', weight: 1.5 },
      { field: 'sellerName', category: 'name' },
      { field: 'billNumber', category: 'code', weight: 1.1 },
    ])
      .slice(0, limit)
      .map((b: any) => ({
        _id: String(b._id),
        label: b.batchCode,
        type: 'purchaseBatch',
        subtitle: `Supplier: ${b.sellerName} • Bill: ${b.billNumber} • Bags: ${b.numberOfBags}`,
        route: `/purchase-batch?q=${encodeURIComponent(b.batchCode)}`,
      }));

    const generalItems = rankSearchResults(generalItemsData.items as any[], normalized.normalizedQuery, [
      { field: 'supplierName', keyField: 'supplierNameKey', category: 'name', weight: 1.2 },
      { field: 'billNumber', category: 'code' },
      { field: 'lineItems.particulars', category: 'name', weight: 0.9 },
    ])
      .slice(0, limit)
      .map((g: any) => {
        const firstItem = g.lineItems?.[0];
        return {
          _id: String(g._id),
          label: firstItem?.particulars || 'General Item Purchase',
          type: 'generalItemPurchase',
          subtitle: `Supplier: ${g.supplierName} • Bill: ${g.billNumber || 'N/A'}`,
          route: `/general-items?q=${encodeURIComponent(firstItem?.particulars || g.supplierName)}`,
        };
      });

    const containsRegex = buildContainsRegex(normalized.normalizedQuery);
    const batchIngredients: SearchResultItem[] = [];
    (batchesData.items as any[]).forEach((b: any) => {
      b.lineItems?.forEach((item: any) => {
        if (item.teaPowderTypeName?.match(containsRegex)) {
          batchIngredients.push({
            _id: `${b._id}-${item._id || item.teaPowderTypeName}`,
            label: item.teaPowderTypeName || 'Unknown Ingredient',
            type: 'batchIngredient',
            subtitle: `Batch: ${b.batchCode} • Quantity: ${item.quantityKg || 0}kg • Price: ₹${item.pricePerKg || 0}/kg`,
            route: `/purchase-batch?tab=purchase-batches&viewId=${b._id}`,
          });
        }
      });
    });

    const customers = rankSearchResults(customersData.items as any[], normalized.normalizedQuery, [
      { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
      { field: 'mobileNumber', category: 'code' },
      { field: 'address', category: 'text', weight: 0.6 },
    ])
      .slice(0, limit)
      .map((c: any) => ({
        _id: String(c._id),
        label: c.name,
        type: 'customer',
        subtitle: `Mobile: ${c.mobileNumber || 'N/A'} • Address: ${c.address || 'N/A'}`,
        route: `/taste-customization?tab=customers&q=${encodeURIComponent(c.name)}`,
      }));

    const suppliers = rankSearchResults(sellersData.items as any[], normalized.normalizedQuery, [
      { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
      { field: 'contactPerson', category: 'name' },
      { field: 'phone', category: 'code' },
      { field: 'email', category: 'text', weight: 0.7 },
    ])
      .slice(0, limit)
      .map((s: any) => ({
        _id: String(s._id),
        label: s.name,
        type: 'supplier',
        subtitle: `Contact: ${s.contactPerson || 'N/A'} • Phone: ${s.phone || 'N/A'}`,
        route: `/sellers?q=${encodeURIComponent(s.name)}`,
      }));

    const teaPowderTypes = rankSearchResults(inventoryData.items as any[], normalized.normalizedQuery, [
      { field: 'name', keyField: 'nameKey', category: 'name', weight: 1.2 },
      { field: 'description', category: 'text', weight: 0.7 },
    ])
      .slice(0, limit)
      .map((item: any) => ({
        _id: String(item._id),
        label: item.name,
        type: 'teaPowderType',
        subtitle: `Inventory Type • ${item.description || 'No description'}`,
        route: `/purchase-batch?tab=types&q=${encodeURIComponent(item.name)}`,
      }));

    const responseData: GroupedSearchResults = {
      customers,
      savedBlends,
      customerTeaBlends,
      purchaseBatches,
      generalItems,
      batchIngredients: batchIngredients.slice(0, limit),
      suppliers,
      teaPowderTypes,
    };

    searchCache.set(cacheKey, responseData, SEARCH_CACHE_TTL_SECONDS);
    const total = Object.values(responseData).reduce((sum, items) => sum + items.length, 0);
    recordSearchProfile({
      module: 'global-search',
      normalizedQuery: normalized.normalizedQuery,
      executionTimeMs: performance.now() - startedAt,
      resultCount: total,
      cacheHit: false,
      engine: 'engine',
    });
    return responseData;
  },
};
