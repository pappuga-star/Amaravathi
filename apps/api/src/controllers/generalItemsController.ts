import type { Request, Response } from 'express';
import { z } from 'zod';
import { escapeRegex, isSearchQueryPresent } from '@amaravathi/shared-utils';
import { created, ok } from '../utils/apiResponse.js';
import { GeneralItemPurchase, GeneralItemsMaster } from '../models/index.js';

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

const rateHistoryCache = new Map<
  string,
  { timestamp: number; data: { stats: any; history: any[] } }
>();
const RATE_HISTORY_CACHE_TTL = 5 * 60 * 1000;

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
  const rawQ = typeof req.query.q === 'string' ? req.query.q : undefined;
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
  const supplierName = String(req.query.supplierName ?? '').trim();
  const particulars = String(req.query.particulars ?? '').trim();
  const billNumber = String(req.query.billNumber ?? '').trim();
  const fromDate = String(req.query.fromDate ?? '').trim();
  const toDate = String(req.query.toDate ?? '').trim();

  const filter: any = { deletedAt: null };
  const andConditions: any[] = [];

  if (supplierName) andConditions.push({ supplierName: new RegExp(escapeRegex(supplierName), 'i') });
  if (particulars) andConditions.push({ 'lineItems.particulars': new RegExp(escapeRegex(particulars), 'i') });
  if (billNumber) andConditions.push({ billNumber: new RegExp(escapeRegex(billNumber), 'i') });

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

  if (isSearchQueryPresent(rawQ)) {
    const safeRegex = new RegExp(escapeRegex(String(rawQ).trim()), 'i');
    andConditions.push({
      $or: [
        { supplierName: safeRegex },
        { billNumber: safeRegex },
        { notes: safeRegex },
        { 'lineItems.particulars': safeRegex },
      ],
    });
  }

  if (andConditions.length) filter.$and = andConditions;

  const [items, total] = await Promise.all([
    GeneralItemPurchase.find(filter)
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    GeneralItemPurchase.countDocuments(filter),
  ]);

  return ok(res, { items: items.map(formatPurchase), total, page, limit });
}

export async function createGeneralItem(req: Request, res: Response) {
  const body = generalItemPurchaseSchema.parse(req.body);
  const record = await GeneralItemPurchase.create(normalizePurchasePayload(body));
  rateHistoryCache.clear();
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
  rateHistoryCache.clear();
  return ok(res, formatPurchase(item.toObject()), 'Updated');
}

export async function deleteGeneralItem(req: Request, res: Response) {
  const item = await GeneralItemPurchase.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item purchase not found'), { status: 404 });
  item.deletedAt = new Date();
  await item.save();
  rateHistoryCache.clear();
  return ok(res, { id: req.params.id }, 'Deleted');
}

export async function generalItemsRateHistory(req: Request, res: Response) {
  const supplierName = String(req.query.supplierName ?? '').trim();
  const particulars = String(req.query.particulars ?? '').trim();

  if (!particulars) {
    throw Object.assign(new Error('particulars is required'), { status: 422 });
  }

  const cacheKey = `${supplierName.toLowerCase()}::${particulars.toLowerCase()}`;
  const cached = rateHistoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RATE_HISTORY_CACHE_TTL) {
    return ok(res, cached.data);
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
  rateHistoryCache.set(cacheKey, { timestamp: Date.now(), data: payload });
  return ok(res, payload);
}

export async function generalItemsStockSummary(_req: Request, res: Response) {
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

  return ok(res, Array.from(map.values()).sort((a, b) => a.particulars.localeCompare(b.particulars)));
}

export async function listGeneralItemsMaster(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim();
  const filter: any = { deletedAt: null };
  if (q) filter.itemName = new RegExp(escapeRegex(q), 'i');
  const items = await GeneralItemsMaster.find(filter).sort({ itemName: 1 }).lean();
  return ok(res, { items: items.map((item: any) => ({ id: String(item._id), itemName: item.itemName, defaultUnit: item.defaultUnit, isActive: item.isActive })) });
}

export async function createGeneralItemsMaster(req: Request, res: Response) {
  const body = generalItemsMasterSchema.parse(req.body);
  const exists = await GeneralItemsMaster.findOne({ itemName: new RegExp(`^${escapeRegex(body.itemName)}$`, 'i'), deletedAt: null });
  if (exists) throw Object.assign(new Error('Item already exists in master'), { status: 409 });
  const item = await GeneralItemsMaster.create(body);
  return created(res, { id: String(item._id), itemName: item.itemName, defaultUnit: item.defaultUnit, isActive: item.isActive });
}

export async function updateGeneralItemsMaster(req: Request, res: Response) {
  const body = generalItemsMasterSchema.parse(req.body);
  const item = await GeneralItemsMaster.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item master not found'), { status: 404 });
  item.set(body);
  await item.save();
  return ok(res, { id: String(item._id), itemName: item.itemName, defaultUnit: item.defaultUnit, isActive: item.isActive }, 'Updated');
}

export async function deleteGeneralItemsMaster(req: Request, res: Response) {
  const item = await GeneralItemsMaster.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) throw Object.assign(new Error('General item master not found'), { status: 404 });
  item.deletedAt = new Date();
  await item.save();
  return ok(res, { id: req.params.id }, 'Deleted');
}
