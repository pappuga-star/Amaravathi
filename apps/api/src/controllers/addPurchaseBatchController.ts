import type { Request, Response } from 'express';
import {
  purchaseBatchSchema,
  type PurchaseBatch,
} from '@amaravathi/shared-types';
import {
  generateBatchCode,
} from '@amaravathi/shared-utils';
import { created, ok } from '../utils/apiResponse.js';
import { AddPurchaseBatch as AddPurchaseBatchModel } from '../models/index.js';
import { buildContainsRegex } from '../search/search.utils.js';
import { runListSearch } from '../search/search.service.js';
import { invalidateSearchCaches, SEARCH_CACHE_PREFIXES } from '../search/search.events.js';
import { validateSearchQuery } from '../search/search.validators.js';
import { getSearchEngine } from '../search/search-engine-factory.js';

const DUPLICATE_PURCHASE_BATCH_MESSAGE =
  'Duplicate purchase batch. A batch with the same date, seller, and bill number already exists.';

export async function createAddPurchaseBatch(req: Request, res: Response) {
  const body = purchaseBatchSchema.parse(req.body);
  const payload = normalizePayload(body);
  try {
    const purchaseBatch = await AddPurchaseBatchModel.create(payload);
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global, SEARCH_CACHE_PREFIXES.reports],
      reason: 'create',
    });
    return created(res, formatBatch(purchaseBatch.toObject()));
  } catch (error: any) {
    if (isDuplicateKeyError(error)) {
      throwDuplicatePurchaseBatchError(error);
    }
    throw error;
  }
}

export async function updateAddPurchaseBatch(req: Request, res: Response) {
  const body = purchaseBatchSchema.parse(req.body);
  const payload = normalizePayload(body);

  try {
    const purchaseBatch = await AddPurchaseBatchModel.findOneAndUpdate(
      { _id: req.params.id },
      { $set: payload },
      {
        new: true,
        runValidators: true,
        context: 'query',
      },
    ).lean();

    if (!purchaseBatch)
      throw Object.assign(new Error('Purchase batch not found'), {
        status: 404,
      });

    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global, SEARCH_CACHE_PREFIXES.reports],
      reason: 'update',
    });
    return ok(res, formatBatch(purchaseBatch), 'Updated');
  } catch (error: any) {
    if (isDuplicateKeyError(error)) {
      throwDuplicatePurchaseBatchError(error);
    }
    throw error;
  }
}

export async function getAddPurchaseBatch(req: Request, res: Response) {
  const purchaseBatch = await AddPurchaseBatchModel.findById(
    req.params.id,
  ).lean();
  if (!purchaseBatch)
    throw Object.assign(new Error('Purchase batch not found'), { status: 404 });
  return ok(res, formatBatch(purchaseBatch));
}

export async function listAddPurchaseBatches(req: Request, res: Response) {
  const data = await runListSearch({
    namespace: 'add-purchase-batch',
    model: AddPurchaseBatchModel,
    query: req.query,
    defaultSortBy: 'purchaseDate',
    allowedSortBy: ['purchaseDate', 'createdAt', 'batchCode', 'sellerName', 'billNumber'],
    searchFields: [
      { field: 'batchCode', keyField: 'batchCodeKey', category: 'code', weight: 1.2 },
      { field: 'sellerName', category: 'name' },
      { field: 'billNumber', category: 'code' },
      { field: 'lineItems.teaPowderTypeName', category: 'name', weight: 0.7 },
    ],
    buildFilter: (q) => {
      if (!q) return {};
      const regex = buildContainsRegex(q);
      const conditions: any[] = [
        { batchCode: regex },
        { sellerName: regex },
        { billNumber: regex },
        { 'lineItems.teaPowderTypeName': regex },
      ];
      const parsedDate = new Date(q);
      if (!isNaN(parsedDate.getTime())) {
        conditions.push({
          purchaseDate: {
            $gte: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()),
            $lt: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1),
          },
        });
      }
      return { $or: conditions };
    },
  });
  return ok(res, {
    items: data.items.map(formatBatch),
    pagination: data.pagination,
    total: data.total,
    page: data.page,
    limit: data.limit,
  });
}

export async function deleteAddPurchaseBatch(req: Request, res: Response) {
  const purchaseBatch = await AddPurchaseBatchModel.findByIdAndDelete(
    req.params.id,
  );
  if (!purchaseBatch)
    throw Object.assign(new Error('Purchase batch not found'), { status: 404 });
  invalidateSearchCaches({
    prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global, SEARCH_CACHE_PREFIXES.reports],
    reason: 'delete',
  });
  return ok(res, { id: req.params.id }, 'Deleted');
}

export async function lookupAddPurchaseBatch(req: Request, res: Response) {
  const batchCode = String(req.query.batchCode ?? '').trim();
  if (!batchCode)
    throw Object.assign(new Error('Batch code is required'), { status: 422 });
  const purchaseBatch = await AddPurchaseBatchModel.findOne({
    batchCode,
  }).lean();
  if (!purchaseBatch)
    throw Object.assign(new Error('Batch not found'), { status: 404 });
  return ok(res, formatBatch(purchaseBatch));
}

export async function searchAddPurchaseBatches(req: Request, res: Response) {
  const normalized = validateSearchQuery({
    q: req.query.q,
    page: 1,
    limit: 25,
  });
  if (!normalized.hasSearchTerm) return ok(res, []);
  const plan = getSearchEngine().buildPlan({
    normalizedQuery: normalized.normalizedQuery,
    fields: [
      { field: 'batchCode', keyField: 'batchCodeKey', category: 'code' },
      { field: 'sellerName', category: 'name' },
      { field: 'billNumber', category: 'code' },
      { field: 'lineItems.teaPowderTypeName', category: 'name', weight: 0.7 },
    ],
    mode: 'prefix',
  });
  const purchaseBatches = await AddPurchaseBatchModel.find({
    ...(plan.filter as any),
  })
    .sort({ purchaseDate: -1, createdAt: -1 })
    .limit(normalized.limit)
    .lean();

  return ok(res, purchaseBatches.map(formatBatch));
}

export async function latestRatesByTeaPowder(_req: Request, res: Response) {
  const purchaseBatches = await AddPurchaseBatchModel.find()
    .select('lineItems batchCode purchaseDate')
    .sort({ purchaseDate: -1, createdAt: -1 })
    .lean();
  const latestByType = new Map<string, any>();

  for (const batch of purchaseBatches) {
    for (const item of (batch as any).lineItems ?? []) {
      if (!latestByType.has(item.teaPowderTypeName)) {
        latestByType.set(item.teaPowderTypeName, {
          teaPowderType: item.teaPowderTypeName,
          ratePerKg: item.pricePerKg,
          batchCode: (batch as any).batchCode,
          purchaseDate: (batch as any).purchaseDate,
        });
      }
    }
  }

  return ok(res, Array.from(latestByType.values()));
}

function formatBatch(batch: any): PurchaseBatch {
  const lineItems = (batch.lineItems ?? batch.items ?? []).map((item: any) => ({
    _id: item._id ? String(item._id) : undefined,
    id: item._id ? String(item._id) : undefined,
    teaPowderTypeId: String(item.teaPowderTypeId ?? ''),
    teaPowderTypeName: item.teaPowderTypeName ?? item.teaPowderType ?? '',
    quantityKg: Number(item.quantityKg ?? 1),
    pricePerKg: Number(item.pricePerKg ?? item.ratePerKg ?? 0),
    totalAmount: Number(
      item.totalAmount ??
        Number(item.quantityKg ?? 1) *
          Number(item.pricePerKg ?? item.ratePerKg ?? 0),
    ),
    availableStockInGrams: Number(item.availableStockInGrams ?? 0),
    teaPowderType: item.teaPowderTypeName ?? item.teaPowderType ?? '',
    ratePerKg: Number(item.pricePerKg ?? item.ratePerKg ?? 0),
    ingredientCategory: item.ingredientCategory ?? 'Leaf',
    pricePerGram:
      Number(item.pricePerKg ?? item.ratePerKg ?? 0) > 0
        ? Number(item.pricePerKg ?? item.ratePerKg ?? 0) / 1000
        : 0,
    subSerialNumber: Number(item.subSerialNumber ?? 0) || undefined,
  }));

  return {
    id: String(batch._id),
    serialNumber: batch.serialNumber,
    numberOfBags: batch.numberOfBags,
    purchaseDate: batch.purchaseDate.toISOString(),
    billNumber: batch.billNumber,
    sellerId: batch.sellerId ? String(batch.sellerId) : '',
    sellerName: batch.sellerName ?? '',
    batchCode: batch.batchCode,
    lineItems,
    items: lineItems,
    totalQuantityKg: Number(batch.totalQuantityKg ?? 0),
    totalBatchAmount: Number(batch.totalBatchAmount ?? 0),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function normalizePayload(body: any) {
  const lineItems = body.lineItems.map((item: any) => {
    const quantityKg = Number(item.quantityKg);
    const pricePerKg = Number(item.pricePerKg);
    return {
      teaPowderTypeId: item.teaPowderTypeId,
      teaPowderTypeName: String(item.teaPowderTypeName).trim(),
      quantityKg,
      pricePerKg,
      totalAmount: Number((quantityKg * pricePerKg).toFixed(2)),
      availableStockInGrams: Math.round(quantityKg * 1000),
    };
  });

  const totalQuantityKg = Number(
    lineItems
      .reduce((sum: number, item: any) => sum + item.quantityKg, 0)
      .toFixed(3),
  );
  const totalBatchAmount = Number(
    lineItems
      .reduce((sum: number, item: any) => sum + item.totalAmount, 0)
      .toFixed(2),
  );

  const purchaseDate = normalizePurchaseDate(body.purchaseDate);
  const numberOfBags = Number(body.numberOfBags);

  return {
    purchaseDate,
    numberOfBags,
    billNumber: String(body.billNumber).trim(),
    sellerId: body.sellerId ? String(body.sellerId).trim() : undefined,
    sellerName: String(body.sellerName ?? '').trim(),
    batchCode: generateBatchCode(numberOfBags, purchaseDate),
    lineItems,
    totalQuantityKg,
    totalBatchAmount,
  };
}

function normalizePurchaseDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isDuplicateKeyError(error: any) {
  return error?.code === 11000;
}

function throwDuplicatePurchaseBatchError(error: any): never {
  const keyPattern = error?.keyPattern ?? {};
  const message =
    keyPattern.batchCode && !keyPattern.purchaseDate
      ? 'Duplicate purchase batch code. Another batch already uses this generated batch code.'
      : DUPLICATE_PURCHASE_BATCH_MESSAGE;

  throw Object.assign(new Error(message), { status: 409 });
}
