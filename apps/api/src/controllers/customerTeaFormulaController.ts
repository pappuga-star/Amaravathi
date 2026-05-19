import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  CustomerTeaFormula,
  CustomerTeaFormulaHistory,
  Customer,
  AddPurchaseBatch,
} from '../models/index.js';
import { customerTeaFormulaSchema } from '@amaravathi/shared-types';
import { isSearchQueryPresent } from '@amaravathi/shared-utils';
import { ok, created } from '../utils/apiResponse.js';
import { ZodError } from 'zod';
import { AppError, toObjectId } from '../utils/objectId.js';
import { buildContainsRegex } from '../search/search.utils.js';
import { validateSearchQuery } from '../search/search.validators.js';
import { invalidateSearchCaches, SEARCH_CACHE_PREFIXES } from '../search/search.events.js';

function zodIssuesToFieldMap(error: ZodError): Record<string, string> {
  return error.issues.reduce(
    (acc, issue) => {
      const key = issue.path.length ? issue.path.join('.') : 'root';
      if (!acc[key]) {
        acc[key] = issue.message;
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}

function normalizeIncomingLineItems(body: any) {
  if (!body || !Array.isArray(body.lineItems)) return;
  body.lineItems = body.lineItems.map((item: any) => {
    if (!item || typeof item !== 'object') return item;
    return {
      ...item,
      purchaseBatchLineItemId:
        item.purchaseBatchLineItemId?.trim?.() === ''
          ? undefined
          : item.purchaseBatchLineItemId,
    };
  });
}

const PERF_LOGS = process.env.TEA_FORMULA_PERF_LOGS === '1';
const LIST_FIELDS =
  '_id formulaCode customerId totalWeight totalFormulaCost costPerKg costPer100Grams isDefault status createdAt deletedAt';
const SAVE_RESPONSE_FIELDS =
  '_id formulaCode customerId totalWeight totalFormulaCost costPerKg costPer100Grams isDefault status createdAt updatedAt deletedAt';

type IncomingFormulaLineItem = {
  purchaseBatchCode: string;
  purchaseBatchLineItemId: unknown;
  ingredientCategory: 'Leaf' | 'Add-On';
  ingredientName: string;
  quantityInGrams: number;
  pricePerGram?: number | undefined;
  rowCost?: number | undefined;
};

type NormalizedFormulaLineItem = {
  purchaseBatchCode: string;
  purchaseBatchLineItemId: string;
  ingredientCategory: 'Leaf' | 'Add-On';
  ingredientName: string;
  quantityInGrams: number;
  pricePerGram: number;
  rowCost: number;
};

interface PurchaseBatchLineLookup {
  lineItemId: mongoose.Types.ObjectId;
  batchCode: string;
  teaPowderTypeName: string;
  pricePerKg: number;
  availableStockInGrams: number;
}

export async function validateAndBuildLineItems(
  lineItems: IncomingFormulaLineItem[],
): Promise<
  | {
      ok: true;
      updatedLineItems: Array<NormalizedFormulaLineItem>;
      totalWeight: number;
      totalFormulaCost: number;
      costPerKg: number;
      costPer100Grams: number;
    }
  | { ok: false; status: number; message: string }
> {
  const batchCodes = Array.from(new Set(lineItems.map((item) => item.purchaseBatchCode)));
  const lineItemObjectIds = lineItems
    .map((item) => item.purchaseBatchLineItemId)
    .map((id) => String(id ?? '').trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => toObjectId(id, 'purchase batch line item ID'));

  const matchedBatchLineItems = await AddPurchaseBatch.aggregate<PurchaseBatchLineLookup>([
    { $match: { batchCode: { $in: batchCodes } } },
    { $unwind: '$lineItems' },
    lineItemObjectIds.length > 0
      ? { $match: { 'lineItems._id': { $in: lineItemObjectIds } } }
      : { $match: { _id: { $exists: true } } },
    {
      $project: {
        _id: 0,
        batchCode: 1,
        lineItemId: '$lineItems._id',
        teaPowderTypeName: '$lineItems.teaPowderTypeName',
        pricePerKg: '$lineItems.pricePerKg',
        availableStockInGrams: '$lineItems.availableStockInGrams',
      },
    },
  ]);

  const batchLineItemById = new Map<string, PurchaseBatchLineLookup>(
    matchedBatchLineItems.map((item) => [String(item.lineItemId), item]),
  );

  const combinations = new Set<string>();
  for (const item of lineItems) {
    const key = `${item.purchaseBatchCode.toLowerCase()}:${item.ingredientName.toLowerCase()}`;
    if (combinations.has(key)) {
      return {
        ok: false,
        status: 400,
        message: `Duplicate combination inside formula: "${item.ingredientName}" from Batch "${item.purchaseBatchCode}" is selected multiple times.`,
      };
    }
    combinations.add(key);

    const batchItem = batchLineItemById.get(String(item.purchaseBatchLineItemId));
    if (!batchItem) {
      return {
        ok: false,
        status: 400,
        message: `Ingredient "${item.ingredientName}" was not found in Purchase Batch "${item.purchaseBatchCode}" by selected line item.`,
      };
    }
    if (batchItem.batchCode !== item.purchaseBatchCode) {
      return {
        ok: false,
        status: 400,
        message: `Purchase Batch line item mismatch for "${item.ingredientName}" and Batch "${item.purchaseBatchCode}".`,
      };
    }
    if (
      String(batchItem.teaPowderTypeName || '').toLowerCase() !==
      String(item.ingredientName || '').toLowerCase()
    ) {
      return {
        ok: false,
        status: 400,
        message: `Ingredient "${item.ingredientName}" does not match selected Purchase Batch line item.`,
      };
    }
  }

  let totalWeight = 0;
  let totalFormulaCost = 0;
  const updatedLineItems: NormalizedFormulaLineItem[] = lineItems.map((item) => {
    const batchItem = batchLineItemById.get(String(item.purchaseBatchLineItemId));
    if (!batchItem?.lineItemId) {
      throw new AppError(
        'Purchase batch line item ID not found for selected ingredient.',
        400,
      );
    }
    const pricePerGram = batchItem
      ? batchItem.pricePerKg / 1000
      : item.pricePerGram || 0;
    const rowCost = Number((item.quantityInGrams * pricePerGram).toFixed(2));
    totalWeight += item.quantityInGrams;
    totalFormulaCost += rowCost;
    return {
      ...item,
      pricePerGram,
      rowCost,
      purchaseBatchLineItemId: batchItem
        ? String(toObjectId(batchItem.lineItemId, 'purchase batch line item ID'))
        : String(toObjectId(item.purchaseBatchLineItemId, 'purchase batch line item ID')),
    };
  });

  totalFormulaCost = Number(totalFormulaCost.toFixed(2));
  totalWeight = Number(totalWeight.toFixed(2));
  const costPerKg =
    totalWeight > 0
      ? Number(((totalFormulaCost / totalWeight) * 1000).toFixed(2))
      : 0;
  const costPer100Grams =
    totalWeight > 0
      ? Number(((totalFormulaCost / totalWeight) * 100).toFixed(2))
      : 0;

  return {
    ok: true,
    updatedLineItems,
    totalWeight,
    totalFormulaCost,
    costPerKg,
    costPer100Grams,
  };
}

export const customerTeaFormulasController = {
  async list(req: Request, res: Response) {
    if (PERF_LOGS) console.time('customerTeaFormulas.list.total');
    const normalizedSearch = validateSearchQuery(req.query, {
      defaultSortBy: 'createdAt',
      allowedSortBy: ['createdAt'],
    });
    const rawQ = normalizedSearch.rawQuery;
    const customerId = String(req.query.customerId ?? '').trim();
    const leafCategoryId = String(req.query.leafCategoryId ?? '').trim();
    const status = String(req.query.status ?? 'all')
      .trim()
      .toLowerCase();
    const sortBy = normalizedSearch.sortBy;
    const sortOrder = normalizedSearch.sortOrder === 'desc' ? -1 : 1;
    const page = normalizedSearch.page;
    const limit = normalizedSearch.limit;

    const filter: any = {};

    // 1. Customer Filter (route parameter `/customers/:customerId/tea-formulas` or query parameter)
    const activeCustomerId = req.params.customerId || customerId;
    if (activeCustomerId) {
      filter.customerId = activeCustomerId;
    }

    // 2. Leaf Category Filter
    if (leafCategoryId) {
      filter.leafCategoryId = leafCategoryId;
    }

    // 3. Search query
    if (isSearchQueryPresent(rawQ)) {
      const q = normalizedSearch.normalizedQuery;
      const safeRegex = buildContainsRegex(q);
      const matchingCustomers = await Customer.find({
        name: safeRegex,
      })
        .select('_id')
        .lean();
      const customerIds = matchingCustomers.map((c) => c._id);

      filter.$or = [
        { formulaCode: safeRegex },
        ...(customerIds.length > 0
          ? [{ customerId: { $in: customerIds } }]
          : []),
      ];
    }

    // 4. Status filters
    if (status === 'deleted') {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
      if (status === 'active') {
        filter.status = 'Active';
      } else if (status === 'inactive') {
        filter.status = 'Inactive';
      }
    }

    const safeSortBy = sortBy === 'createdAt' ? 'createdAt' : 'createdAt';
    const sortConfig: any = { [safeSortBy]: sortOrder };

    if (PERF_LOGS) console.time('customerTeaFormulas.list.query');
    const [items, total] = await Promise.all([
      CustomerTeaFormula.find(filter)
        .select(LIST_FIELDS)
        .sort(sortConfig)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CustomerTeaFormula.countDocuments(filter),
    ]);
    if (PERF_LOGS) console.timeEnd('customerTeaFormulas.list.query');

    if (PERF_LOGS) console.time('customerTeaFormulas.list.customerMap');
    const customerIds = Array.from(
      new Set(
        items
          .map((item: any) => String(item.customerId || ''))
          .filter((value) => mongoose.Types.ObjectId.isValid(value)),
      ),
    );
    const customers = customerIds.length
      ? await Customer.find({ _id: { $in: customerIds } }).select('_id name').lean()
      : [];
    const customerMap = new Map(customers.map((c: any) => [String(c._id), c.name]));
    if (PERF_LOGS) console.timeEnd('customerTeaFormulas.list.customerMap');

    const normalizedItems = items.map((item: any) => ({
      ...item,
      id: item._id.toString(),
      customerId: item.customerId
        ? { id: String(item.customerId), name: customerMap.get(String(item.customerId)) || '-' }
        : null,
    }));

    const response = ok(res, {
      items: normalizedItems,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
      total,
      page,
      limit,
    });
    if (PERF_LOGS) console.timeEnd('customerTeaFormulas.list.total');
    return response;
  },

  async get(req: Request, res: Response) {
    if (PERF_LOGS) console.time('customerTeaFormulas.get.total');
    const includeHistory = String(req.query.includeHistory ?? 'false') === 'true';
    const item = await CustomerTeaFormula.findById(req.params.id)
      .populate('customerId', 'name')
      .lean();

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'Formula not found' });
    }

    let history: any[] = [];
    if (includeHistory) {
      history = await CustomerTeaFormulaHistory.find({
        formulaId: req.params.id,
      })
        .populate('changedBy', 'name')
        .sort({ createdAt: -1 })
        .lean();
    }

    const response = ok(res, {
      ...item,
      id: item._id.toString(),
      history: history.map((h: any) => ({ ...h, id: h._id.toString() })),
    });
    if (PERF_LOGS) console.timeEnd('customerTeaFormulas.get.total');
    return response;
  },

  async create(req: Request, res: Response) {
    if (PERF_LOGS) console.time('customerTeaFormulas.create.total');
    normalizeIncomingLineItems(req.body);

    let parsed;
    try {
      parsed = customerTeaFormulaSchema.parse(req.body);
    } catch (e: any) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors:
          e instanceof ZodError
            ? zodIssuesToFieldMap(e)
            : { root: 'Invalid request payload' },
      });
    }

    if (PERF_LOGS) console.time('customerTeaFormulas.create.validateCustomer');
    const customer = await Customer.findOne({
      _id: parsed.customerId,
      active: true,
    })
      .select('_id')
      .lean();
    if (PERF_LOGS) console.timeEnd('customerTeaFormulas.create.validateCustomer');
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive Customer.',
      });
    }

    if (PERF_LOGS) console.time('customerTeaFormulas.create.validateLineItems');
    const computed = await validateAndBuildLineItems(parsed.lineItems);
    if (PERF_LOGS) console.timeEnd('customerTeaFormulas.create.validateLineItems');
    if (!computed.ok) {
      return res.status(computed.status).json({
        success: false,
        message: computed.message,
      });
    }

    if (parsed.isDefault) {
      await CustomerTeaFormula.updateMany(
        { customerId: parsed.customerId },
        { isDefault: false },
      );
    }

    const formulaPayload = {
      ...parsed,
      lineItems: computed.updatedLineItems,
      totalWeight: computed.totalWeight,
      totalFormulaCost: computed.totalFormulaCost,
      costPerKg: computed.costPerKg,
      costPer100Grams: computed.costPer100Grams,
    };

    if (PERF_LOGS) console.time('customerTeaFormulas.create.save');
    try {
      const formula = await CustomerTeaFormula.create(formulaPayload);

      await CustomerTeaFormulaHistory.create({
        formulaId: formula._id,
        snapshot: formula.toObject(),
        changedBy: (req as any).user?.id,
        changeType: 'Create',
      });

      const saved = await CustomerTeaFormula.findById(formula._id)
        .select(SAVE_RESPONSE_FIELDS)
        .lean();
      if (PERF_LOGS) console.timeEnd('customerTeaFormulas.create.save');
      const response = created(res, {
        ...(saved || formula.toObject()),
        id: formula._id.toString(),
      });
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'create',
      });
      if (PERF_LOGS) console.timeEnd('customerTeaFormulas.create.total');
      return response;
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A formula with this code already exists.',
        });
      }
      throw error;
    }
  },

  async update(req: Request, res: Response) {
    normalizeIncomingLineItems(req.body);
    let parsed;
    try {
      parsed = customerTeaFormulaSchema.partial().parse(req.body);
    } catch (e: any) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors:
          e instanceof ZodError
            ? zodIssuesToFieldMap(e)
            : { root: 'Invalid request payload' },
      });
    }

    const existingFormula = await CustomerTeaFormula.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!existingFormula) {
      return res
        .status(404)
        .json({ success: false, message: 'Formula not found' });
    }

    const updatedPayload = { ...parsed };

    const checkCust = parsed.customerId || existingFormula.customerId;
    const finalLineItems =
      parsed.lineItems !== undefined
        ? parsed.lineItems
        : existingFormula.lineItems;

    if (finalLineItems && finalLineItems.length > 0) {
      const computed = await validateAndBuildLineItems(finalLineItems);
      if (!computed.ok) {
        return res.status(computed.status).json({
          success: false,
          message: computed.message,
        });
      }
      updatedPayload.lineItems = computed.updatedLineItems;
      updatedPayload.totalWeight = computed.totalWeight;
      updatedPayload.totalFormulaCost = computed.totalFormulaCost;
      updatedPayload.costPerKg = computed.costPerKg;
      updatedPayload.costPer100Grams = computed.costPer100Grams;
    }

    if (parsed.isDefault) {
      await CustomerTeaFormula.updateMany(
        { customerId: checkCust },
        { isDefault: false },
      );
    }

    try {
      const formula = await CustomerTeaFormula.findByIdAndUpdate(
        req.params.id,
        updatedPayload,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!formula) {
        return res
          .status(404)
          .json({ success: false, message: 'Formula not found' });
      }

      await CustomerTeaFormulaHistory.create({
        formulaId: formula._id,
        snapshot: formula.toObject(),
        changedBy: (req as any).user?.id,
        changeType: 'Update',
      });
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'update',
      });

      return ok(
        res,
        { ...formula.toObject(), id: formula._id.toString() },
        'Updated',
      );
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A formula with this code already exists.',
        });
      }
      throw error;
    }
  },

  async remove(req: Request, res: Response) {
    const formula = await CustomerTeaFormula.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), isDefault: false, status: 'Inactive' },
      { new: true },
    );

    if (!formula) {
      return res
        .status(404)
        .json({ success: false, message: 'Formula not found' });
    }
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
      reason: 'delete',
    });

    return ok(res, { id: req.params.id }, 'Soft Deleted');
  },

  async setDefault(req: Request, res: Response) {
    const formula = await CustomerTeaFormula.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!formula) {
      return res
        .status(404)
        .json({ success: false, message: 'Formula not found' });
    }

    await CustomerTeaFormula.updateMany(
      { customerId: formula.customerId },
      { isDefault: false },
    );
    formula.isDefault = true;
    await formula.save();

    await CustomerTeaFormulaHistory.create({
      formulaId: formula._id,
      snapshot: formula.toObject(),
      changedBy: (req as any).user?.id,
      changeType: 'Update',
    });
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
      reason: 'update',
    });

    return ok(
      res,
      { ...formula.toObject(), id: formula._id.toString() },
      'Set as default formula',
    );
  },

  async duplicate(req: Request, res: Response) {
    const source = await CustomerTeaFormula.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!source) {
      return res
        .status(404)
        .json({ success: false, message: 'Source formula not found' });
    }

    const payload = {
      customerId: source.customerId,
      notes: source.notes,
      totalWeight: source.totalWeight,
      totalFormulaCost: source.totalFormulaCost,
      costPerKg: source.costPerKg,
      costPer100Grams: source.costPer100Grams,
      lineItems: source.lineItems,
      isDefault: false,
      status: source.status,
    };

    const copy = await CustomerTeaFormula.create(payload);

    await CustomerTeaFormulaHistory.create({
      formulaId: copy._id,
      snapshot: copy.toObject(),
      changedBy: (req as any).user?.id,
      changeType: 'Create',
    });
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
      reason: 'create',
    });

    return created(
      res,
      { ...copy.toObject(), id: copy._id.toString() },
      'Formula duplicated',
    );
  },
};
