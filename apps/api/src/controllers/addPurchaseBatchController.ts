import type { Request, Response } from 'express';
import {
  purchaseBatchSchema,
  type PurchaseBatch,
} from '@amaravathi/shared-types';
import { escapeRegex, isSearchQueryPresent } from '@amaravathi/shared-utils';
import { created, ok } from '../utils/apiResponse.js';
import { AddPurchaseBatch as AddPurchaseBatchModel } from '../models/index.js';

export async function createAddPurchaseBatch(req: Request, res: Response) {
  const body = purchaseBatchSchema.parse(req.body);
  const payload = normalizePayload(body);
  const purchaseBatch = await AddPurchaseBatchModel.create(payload);
  return created(res, formatBatch(purchaseBatch.toObject()));
}

export async function updateAddPurchaseBatch(req: Request, res: Response) {
  const body = purchaseBatchSchema.parse(req.body);
  const payload = normalizePayload(body);
  const purchaseBatch = await AddPurchaseBatchModel.findById(req.params.id);
  if (!purchaseBatch)
    throw Object.assign(new Error('Purchase batch not found'), { status: 404 });

  purchaseBatch.set(payload);
  await purchaseBatch.save();
  return ok(res, formatBatch(purchaseBatch.toObject()), 'Updated');
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
  const rawQ = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

  let filter: any = {};
  if (isSearchQueryPresent(rawQ)) {
    const q = String(rawQ).trim();
    const safeRegex = new RegExp(escapeRegex(q), 'i');
    const conditions: any[] = [
      { batchCode: safeRegex },
      { sellerName: safeRegex },
      { billNumber: safeRegex },
      { 'lineItems.teaPowderTypeName': safeRegex },
    ];

    // Check if query is a valid date
    const parsedDate = new Date(q);
    if (!isNaN(parsedDate.getTime())) {
      conditions.push({
        purchaseDate: {
          $gte: new Date(
            parsedDate.getFullYear(),
            parsedDate.getMonth(),
            parsedDate.getDate(),
          ),
          $lt: new Date(
            parsedDate.getFullYear(),
            parsedDate.getMonth(),
            parsedDate.getDate() + 1,
          ),
        },
      });
    }

    filter = { $or: conditions };
  }

  const [items, total] = await Promise.all([
    AddPurchaseBatchModel.find(filter)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AddPurchaseBatchModel.countDocuments(filter),
  ]);
  return ok(res, {
    items: items.map(formatBatch),
    total,
    page,
    limit,
  });
}

export async function deleteAddPurchaseBatch(req: Request, res: Response) {
  const purchaseBatch = await AddPurchaseBatchModel.findByIdAndDelete(
    req.params.id,
  );
  if (!purchaseBatch)
    throw Object.assign(new Error('Purchase batch not found'), { status: 404 });
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
  const rawQ = typeof req.query.q === 'string' ? req.query.q : undefined;
  if (!isSearchQueryPresent(rawQ)) return ok(res, []);

  const q = String(rawQ).trim();
  const safeRegex = new RegExp(escapeRegex(q), 'i');
  const purchaseBatches = await AddPurchaseBatchModel.find({
    $or: [
      { batchCode: safeRegex },
      { sellerName: safeRegex },
      { billNumber: safeRegex },
      { 'lineItems.teaPowderTypeName': safeRegex },
    ],
  })
    .sort({ purchaseDate: -1, createdAt: -1 })
    .limit(25)
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
        Number(item.quantityKg ?? 1) * Number(item.pricePerKg ?? item.ratePerKg ?? 0),
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
    lineItems.reduce((sum: number, item: any) => sum + item.quantityKg, 0).toFixed(3),
  );
  const totalBatchAmount = Number(
    lineItems.reduce((sum: number, item: any) => sum + item.totalAmount, 0).toFixed(2),
  );

  return {
    purchaseDate: body.purchaseDate,
    numberOfBags: Number(body.numberOfBags),
    billNumber: String(body.billNumber).trim(),
    sellerId: body.sellerId ? String(body.sellerId).trim() : undefined,
    sellerName: String(body.sellerName ?? '').trim(),
    batchCode: body.batchCode,
    lineItems,
    totalQuantityKg,
    totalBatchAmount,
  };
}
