import type { Request, Response } from 'express';
import {
  purchaseBatchSchema,
  type PurchaseBatch,
} from '@amaravathi/shared-types';
import { created, ok } from '../utils/apiResponse.js';
import { AddPurchaseBatch as AddPurchaseBatchModel } from '../models/index.js';

export async function createAddPurchaseBatch(req: Request, res: Response) {
  const body = purchaseBatchSchema.parse(req.body);
  const purchaseBatch = await AddPurchaseBatchModel.create(body);
  return created(res, formatBatch(purchaseBatch.toObject()));
}

export async function updateAddPurchaseBatch(req: Request, res: Response) {
  const body = purchaseBatchSchema.partial().parse(req.body);
  const purchaseBatch = await AddPurchaseBatchModel.findByIdAndUpdate(
    req.params.id,
    body,
    {
      new: true,
      runValidators: true,
    },
  ).lean();
  if (!purchaseBatch)
    throw Object.assign(new Error('Purchase batch not found'), { status: 404 });
  return ok(res, formatBatch(purchaseBatch), 'Updated');
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
  const q = String(req.query.q ?? '').trim();
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

  let filter: any = {};
  if (q) {
    const conditions: any[] = [
      { batchCode: { $regex: q, $options: 'i' } },
      { sellerName: { $regex: q, $options: 'i' } },
      { billNumber: { $regex: q, $options: 'i' } },
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
  const q = String(req.query.q ?? '').trim();
  if (!q) return ok(res, []);

  const purchaseBatches = await AddPurchaseBatchModel.find({
    $or: [
      { batchCode: { $regex: q, $options: 'i' } },
      { sellerName: { $regex: q, $options: 'i' } },
      { billNumber: { $regex: q, $options: 'i' } },
      { 'items.teaPowderType': { $regex: q, $options: 'i' } },
    ],
  })
    .sort({ purchaseDate: -1, createdAt: -1 })
    .limit(25)
    .lean();

  return ok(res, purchaseBatches.map(formatBatch));
}

export async function latestRatesByTeaPowder(_req: Request, res: Response) {
  const purchaseBatches = await AddPurchaseBatchModel.find()
    .sort({ purchaseDate: -1, createdAt: -1 })
    .lean();
  const latestByType = new Map<string, any>();

  for (const batch of purchaseBatches) {
    for (const item of (batch as any).items) {
      if (!latestByType.has(item.teaPowderType)) {
        latestByType.set(item.teaPowderType, {
          teaPowderType: item.teaPowderType,
          ratePerKg: item.ratePerKg,
          batchCode: (batch as any).batchCode,
          purchaseDate: (batch as any).purchaseDate,
        });
      }
    }
  }

  return ok(res, Array.from(latestByType.values()));
}

function formatBatch(batch: any): PurchaseBatch {
  return {
    id: String(batch._id),
    serialNumber: batch.serialNumber,
    numberOfBags: batch.numberOfBags,
    purchaseDate: batch.purchaseDate.toISOString(),
    billNumber: batch.billNumber,
    sellerName: batch.sellerName,
    batchCode: batch.batchCode,
    items: batch.items.map((item: any) => ({
      subSerialNumber: item.subSerialNumber,
      teaPowderType: item.teaPowderType,
      ratePerKg: item.ratePerKg,
      ingredientCategory: item.ingredientCategory || 'Leaf',
      pricePerGram: item.pricePerGram || item.ratePerKg / 1000,
      availableStockInGrams: item.availableStockInGrams || 50000,
    })),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}
