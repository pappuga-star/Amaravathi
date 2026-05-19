import type { Request, Response } from 'express';
import { z } from 'zod';
import { created, ok } from '../utils/apiResponse.js';
import { GeneralItemPurchase, GeneralItemsMaster } from '../models/index.js';
import { buildContainsRegex, escapeRegex } from '../search/search.utils.js';
import { runListSearch } from '../search/search.service.js';
import { invalidateSearchCaches, SEARCH_CACHE_PREFIXES } from '../search/search.events.js';
import { searchCache } from '../search/search.cache.js';
import { SEARCH_CACHE_TTL_SECONDS } from '../search/search.constants.js';

const UNIT_VALUES = [
  'Kg',
  'Grams',
  'Pieces',
  'Boxes',
  'Packets',
  'Dozens',
  'Liters',
] as const;

const generalItemLineSchema = z.object({
  particulars: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.enum(UNIT_VALUES),
  ratePerUnit: z.coerce.number().positive(),
  amount: z.coerce.number().nonnegative().optional(),
});

const generalItemPurchaseSchema = z.object({
  purchaseDate: z.coerce.date(),
  billNumber: z.string().trim().optional(),
  supplierName: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  lineItems: z.array(generalItemLineSchema).min(1),
});

const generalItemsMasterSchema = z.object({
  itemName: z.string().trim().min(1),
  defaultUnit: z.enum(UNIT_VALUES),
  isActive: z.boolean().optional().default(true),
});

let stockSummaryCache: { timestamp: number; data: any[] } | null = null;
const STOCK_SUMMARY_CACHE_TTL = 2 * 60 * 1000;

function normalizePurchasePayload(body: z.infer<typeof generalItemPurchaseSchema>) {
  const lineItems = body.lineItems.map((item) => {
    const quantity = Number(item.quantity);
    const ratePerUnit = Number(item.ratePerUnit);
    const amount = Number((quantity * ratePerUnit).toFixed(2));
    return {
      particulars: item.particulars.trim(),
      quantity,
      unit: item.unit,
      ratePerUnit,
      amount,
    };
  });

  return {
    purchaseDate: body.purchaseDate,
    billNumber: String(body.billNumber ?? '').trim(),
    supplierName: body.supplierName.trim(),
    notes: String(body.notes ?? '').trim(),
    lineItems,
    totalAmount: Number(
      lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
    ),
  };
}

function formatPurchase(doc: any) {
  return {
    id: String(doc._id),
    purchaseDate: doc.purchaseDate?.toISOString?.() ?? doc.purchaseDate,
    billNumber: doc.billNumber ?? '',
    supplierName: doc.supplierName,
    notes: doc.notes ?? '',
    lineItems: (doc.lineItems ?? []).map((item: any) => ({
      id: item._id ? String(item._id) : undefined,
      particulars: item.particulars,
      quantity: Number(item.quantity ?? 0),
      unit: item.unit,
      ratePerUnit: Number(item.ratePerUnit ?? 0),
      amount: Number(item.amount ?? 0),
    })),
    totalAmount: Number(doc.totalAmount ?? 0),
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  };
}

export async function listGeneralItems(req: Request, res: Response) {
  const supplierName = String(req.query.supplierName ?? '').trim();
  const particulars = String(req.query.particulars ?? '').trim();
  const billNumber = String(req.query.billNumber ?? '').trim();
  const fromDate = String(req.query.fromDate ?? '').trim();
  const toDate = String(req.query.toDate ?? '').trim();

  const baseFilter: any = { deletedAt: null };
  const andConditions: any[] = [];

  if (supplierName) andConditions.push({ supplierName: buildContainsRegex(supplierName) });
  if (particulars) andConditions.push({ 'lineItems.particulars': buildContainsRegex(particulars) });
  if (billNumber) andConditions.push({ billNumber: buildContainsRegex(billNumber) });

  if (fromDate || toDate) {
    const dateFilter: any = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    andConditions.push({ purchaseDate: dateFilter });
  }

  const data = await runListSearch({
    namespace: 'general-items',
    model: GeneralItemPurchase,
    query: req.query,
    defaultSortBy: 'purchaseDate',
    allowedSortBy: ['purchaseDate', 'createdAt', 'supplierName', 'billNumber'],
    searchFields: [
      { field: 'supplierName', keyField: 'supplierNameKey', category: 'name', weight: 1.2 },
      { field: 'billNumber', category: 'code', weight: 1.1 },
      { field: 'notes', category: 'text' },
      { field: 'lineItems.particulars', category: 'name', weight: 0.9 },
    ],
    baseFilter,
    buildFilter: (q) => {
      const clauses: any[] = [...andConditions];
      if (q) {
        const safeRegex = buildContainsRegex(q);
        clauses.push({
          $or: [
            { supplierName: safeRegex },
            { billNumber: safeRegex },
            { notes: safeRegex },
            { 'lineItems.particulars': safeRegex },
          ],
        });
      }
      return clauses.length ? { $and: clauses } : {};
    },
  });

  return ok(res, {
    items: data.items.map(formatPurchase),
    pagination: data.pagination,
    total: data.total,
    page: data.page,
    limit: data.limit,
  });
}

export async function createGeneralItem(req: Request, res: Response) {
  const body = generalItemPurchaseSchema.parse(req.body);
  const record = await GeneralItemPurchase.create(normalizePurchasePayload(body));
  searchCache.clearByPrefix(SEARCH_CACHE_PREFIXES.list);
  stockSummaryCache = null;
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.global, SEARCH_CACHE_PREFIXES.list],
    reason: 'create',
  });
  return created(res, formatPurchase(record.toObject()));
}

export async function getGeneralItem(req: Request, res: Response) {
  const item = await GeneralItemPurchase.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!item) throw Object.assign(new Error('General item purchase not found'), { status: 404 });
  return ok(res, formatPurchase(item));
}

export async function updateGeneralItem(req: Request, res: Response) {
  const body = generalItemPurchaseSchema.parse(req.body);
  const item = await GeneralItemPurchase.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item purchase not found'), { status: 404 });

  item.set(normalizePurchasePayload(body));
  await item.save();
  searchCache.clearByPrefix(SEARCH_CACHE_PREFIXES.list);
  stockSummaryCache = null;
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.global, SEARCH_CACHE_PREFIXES.list],
    reason: 'update',
  });
  return ok(res, formatPurchase(item.toObject()), 'Updated');
}

export async function deleteGeneralItem(req: Request, res: Response) {
  const item = await GeneralItemPurchase.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item purchase not found'), { status: 404 });
  item.deletedAt = new Date();
  await item.save();
  searchCache.clearByPrefix(SEARCH_CACHE_PREFIXES.list);
  stockSummaryCache = null;
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.global, SEARCH_CACHE_PREFIXES.list],
    reason: 'delete',
  });
  return ok(res, { id: req.params.id }, 'Deleted');
}

export async function generalItemsRateHistory(req: Request, res: Response) {
  const supplierName = String(req.query.supplierName ?? '').trim();
  const particulars = String(req.query.particulars ?? '').trim();

  if (!particulars) {
    throw Object.assign(new Error('particulars is required'), { status: 422 });
  }

  const cacheKey = `${SEARCH_CACHE_PREFIXES.reports}:general-items-rate-history:${supplierName.toLowerCase()}::${particulars.toLowerCase()}`;
  const cached = searchCache.get<{ stats: any; history: any[] }>(cacheKey);
  if (cached) {
    return ok(res, cached);
  }

  const query: any = {
    deletedAt: null,
    'lineItems.particulars': new RegExp(`^${escapeRegex(particulars)}$`, 'i'),
  };
  if (supplierName) {
    query.supplierName = new RegExp(`^${escapeRegex(supplierName)}$`, 'i');
  }

  const docs = await GeneralItemPurchase.find(query)
    .sort({ purchaseDate: -1, createdAt: -1 })
    .lean();

  const rows = docs.flatMap((doc: any) =>
    (doc.lineItems ?? [])
      .filter((it: any) => it.particulars?.toLowerCase?.() === particulars.toLowerCase())
      .map((it: any) => ({
        purchaseDate: doc.purchaseDate,
        supplierName: doc.supplierName,
        billNumber: doc.billNumber,
        quantity: Number(it.quantity ?? 0),
        unit: it.unit,
        ratePerUnit: Number(it.ratePerUnit ?? 0),
        amount: Number(it.amount ?? 0),
      })),
  );

  const rates = rows.map((r) => r.ratePerUnit);
  const last = rows[0] ?? null;
  const stats = {
    lastPurchaseDate: last?.purchaseDate ?? null,
    lastRate: last?.ratePerUnit ?? null,
    lowestRate: rates.length ? Math.min(...rates) : null,
    highestRate: rates.length ? Math.max(...rates) : null,
    averageRate: rates.length
      ? Number((rates.reduce((s, r) => s + r, 0) / rates.length).toFixed(2))
      : null,
  };

  const payload = { stats, history: rows };
  searchCache.set(cacheKey, payload, SEARCH_CACHE_TTL_SECONDS);
  return ok(res, payload);
}

export async function generalItemsStockSummary(_req: Request, res: Response) {
  if (stockSummaryCache && Date.now() - stockSummaryCache.timestamp < STOCK_SUMMARY_CACHE_TTL) {
    return ok(res, stockSummaryCache.data);
  }

  const docs = await GeneralItemPurchase.find({ deletedAt: null }).lean();
  const map = new Map<string, { particulars: string; unit: string; totalPurchasedQuantity: number; totalConsumedQuantity: number; currentStock: number }>();

  for (const doc of docs as any[]) {
    for (const item of doc.lineItems ?? []) {
      const key = `${String(item.particulars).toLowerCase()}::${item.unit}`;
      const curr = map.get(key) ?? {
        particulars: item.particulars,
        unit: item.unit,
        totalPurchasedQuantity: 0,
        totalConsumedQuantity: 0,
        currentStock: 0,
      };
      curr.totalPurchasedQuantity += Number(item.quantity ?? 0);
      curr.currentStock = curr.totalPurchasedQuantity - curr.totalConsumedQuantity;
      map.set(key, curr);
    }
  }

  const payload = Array.from(map.values()).sort((a, b) => a.particulars.localeCompare(b.particulars));
  stockSummaryCache = { timestamp: Date.now(), data: payload };
  return ok(res, payload);
}

export async function listGeneralItemsMaster(req: Request, res: Response) {
  const data = await runListSearch({
    namespace: 'general-items-master',
    model: GeneralItemsMaster,
    query: req.query,
    defaultSortBy: 'itemName',
    allowedSortBy: ['itemName', 'createdAt'],
    baseFilter: { deletedAt: null },
    buildFilter: (q) => (q ? { itemName: buildContainsRegex(q) } : {}),
  });
  return ok(res, {
    items: data.items.map((item: any) => ({ id: String(item._id), itemName: item.itemName, defaultUnit: item.defaultUnit, isActive: item.isActive })),
    pagination: data.pagination,
    total: data.total,
    page: data.page,
    limit: data.limit,
  });
}

export async function createGeneralItemsMaster(req: Request, res: Response) {
  const body = generalItemsMasterSchema.parse(req.body);
  const exists = await GeneralItemsMaster.findOne({ itemName: new RegExp(`^${escapeRegex(body.itemName)}$`, 'i'), deletedAt: null });
  if (exists) throw Object.assign(new Error('Item already exists in master'), { status: 409 });
  const item = await GeneralItemsMaster.create(body);
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
    reason: 'create',
  });
  return created(res, { id: String(item._id), itemName: item.itemName, defaultUnit: item.defaultUnit, isActive: item.isActive });
}

export async function updateGeneralItemsMaster(req: Request, res: Response) {
  const body = generalItemsMasterSchema.parse(req.body);
  const item = await GeneralItemsMaster.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item master not found'), { status: 404 });
  item.set(body);
  await item.save();
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
    reason: 'update',
  });
  return ok(res, { id: String(item._id), itemName: item.itemName, defaultUnit: item.defaultUnit, isActive: item.isActive }, 'Updated');
}

export async function deleteGeneralItemsMaster(req: Request, res: Response) {
  const item = await GeneralItemsMaster.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item master not found'), { status: 404 });
  item.deletedAt = new Date();
  await item.save();
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
    reason: 'delete',
  });
  return ok(res, { id: req.params.id }, 'Deleted');
}
