import type { Request, Response } from 'express';
import {
  CustomerTeaFormula,
  CustomerTeaFormulaHistory,
  Customer,
  AddPurchaseBatch,
} from '../models/index.js';
import { customerTeaFormulaSchema } from '@amaravathi/shared-types';
import { escapeRegex, isSearchQueryPresent } from '@amaravathi/shared-utils';
import { ok, created } from '../utils/apiResponse.js';
import { ZodError } from 'zod';

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

function getBatchLineItems(batch: any) {
  if (Array.isArray(batch?.lineItems)) return batch.lineItems;
  // Explicitly reject malformed/legacy-only records instead of crashing.
  return [];
}

async function validateAndBuildLineItems(
  lineItems: Array<any>,
): Promise<
  | {
      ok: true;
      updatedLineItems: Array<any>;
      totalWeight: number;
      totalFormulaCost: number;
      costPerKg: number;
      costPer100Grams: number;
    }
  | { ok: false; status: number; message: string }
> {
  const batchCodes = Array.from(new Set(lineItems.map((item) => item.purchaseBatchCode)));
  const batches = await AddPurchaseBatch.find({
    batchCode: { $in: batchCodes },
  }).lean();
  const batchMap = new Map<string, any>(batches.map((b) => [b.batchCode, b]));

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

    const batch = batchMap.get(item.purchaseBatchCode);
    if (!batch) {
      return {
        ok: false,
        status: 400,
        message: `Purchase Batch with code "${item.purchaseBatchCode}" not found.`,
      };
    }

    const batchLineItems = getBatchLineItems(batch);
    if (batchLineItems.length === 0) {
      return {
        ok: false,
        status: 400,
        message: `Purchase Batch "${item.purchaseBatchCode}" has no valid line items. Please edit and save the batch again.`,
      };
    }

    const batchItem = batchLineItems.find(
      (bi: any) =>
        bi._id?.toString() === item.purchaseBatchLineItemId ||
        bi.teaPowderTypeName?.toLowerCase() === item.ingredientName.toLowerCase(),
    );
    if (!batchItem) {
      return {
        ok: false,
        status: 400,
        message: `Ingredient "${item.ingredientName}" was not found in Purchase Batch "${item.purchaseBatchCode}".`,
      };
    }
  }

  let totalWeight = 0;
  let totalFormulaCost = 0;
  const updatedLineItems = lineItems.map((item: any) => {
    const batch = batchMap.get(item.purchaseBatchCode);
    const batchItem = getBatchLineItems(batch).find(
      (bi: any) =>
        bi._id?.toString() === item.purchaseBatchLineItemId ||
        bi.teaPowderTypeName?.toLowerCase() === item.ingredientName.toLowerCase(),
    );
    const pricePerGram = batchItem ? batchItem.pricePerKg / 1000 : item.pricePerGram || 0;
    const rowCost = Number((item.quantityInGrams * pricePerGram).toFixed(2));
    totalWeight += item.quantityInGrams;
    totalFormulaCost += rowCost;
    return {
      ...item,
      pricePerGram,
      rowCost,
      purchaseBatchLineItemId: batchItem
        ? batchItem._id.toString()
        : item.purchaseBatchLineItemId,
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
    const rawQ = typeof req.query.q === 'string' ? req.query.q : undefined;
    const customerId = String(req.query.customerId ?? '').trim();
    const leafCategoryId = String(req.query.leafCategoryId ?? '').trim();
    const status = String(req.query.status ?? 'all')
      .trim()
      .toLowerCase();
    const sortBy = String(req.query.sortBy ?? 'createdAt').trim();
    const sortOrder =
      String(req.query.sortOrder ?? 'desc')
        .trim()
        .toLowerCase() === 'desc'
        ? -1
        : 1;

    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 1000);

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
      const q = String(rawQ).trim();
      const safeRegex = new RegExp(escapeRegex(q), 'i');
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

    const sortConfig: any = { [sortBy]: sortOrder };

    const [items, total] = await Promise.all([
      CustomerTeaFormula.find(filter)
        .populate('customerId', 'name')
        .sort(sortConfig)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CustomerTeaFormula.countDocuments(filter),
    ]);

    const normalizedItems = items.map((item: any) => ({
      ...item,
      id: item._id.toString(),
    }));

    return ok(res, { items: normalizedItems, total, page, limit });
  },

  async get(req: Request, res: Response) {
    const item = await CustomerTeaFormula.findById(req.params.id)
      .populate('customerId', 'name')
      .lean();

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'Formula not found' });
    }

    // Fetch snapshot history
    const history = await CustomerTeaFormulaHistory.find({
      formulaId: req.params.id,
    })
      .populate('changedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, {
      ...item,
      id: item._id.toString(),
      history: history.map((h: any) => ({ ...h, id: h._id.toString() })),
    });
  },

  async create(req: Request, res: Response) {
    console.log('Incoming Customer Tea Formula Payload:');
    console.log(JSON.stringify(req.body, null, 2));

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

    const customer = await Customer.findOne({
      _id: parsed.customerId,
      active: true,
    });
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive Customer.',
      });
    }

    const computed = await validateAndBuildLineItems(parsed.lineItems);
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

    try {
      const formula = await CustomerTeaFormula.create(formulaPayload);

      await CustomerTeaFormulaHistory.create({
        formulaId: formula._id,
        snapshot: formula.toObject(),
        changedBy: (req as any).user?.id,
        changeType: 'Create',
      });

      return created(res, {
        ...formula.toObject(),
        id: formula._id.toString(),
      });
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

    return created(
      res,
      { ...copy.toObject(), id: copy._id.toString() },
      'Formula duplicated',
    );
  },
};
