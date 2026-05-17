import type { Request, Response } from 'express';
import { AddPurchaseBatch } from '../models/index.js';
import { ok } from '../utils/apiResponse.js';

export async function latestPurchaseRates(_req: Request, res: Response) {
  const batch = await AddPurchaseBatch.findOne()
    .sort({ purchaseDate: -1, createdAt: -1 })
    .lean();
  return ok(res, batch);
}

export async function sellerPurchaseHistory(req: Request, res: Response) {
  const sellerName = String(req.query.sellerName ?? '').trim();
  if (!sellerName)
    throw Object.assign(new Error('Seller name is required'), { status: 422 });
  const batches = await AddPurchaseBatch.find({
    sellerName: { $regex: sellerName, $options: 'i' },
  })
    .sort({ purchaseDate: -1 })
    .lean();
  return ok(res, batches);
}
