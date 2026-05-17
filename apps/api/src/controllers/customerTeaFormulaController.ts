import type { Request, Response } from 'express';
import {
  CustomerTeaFormula,
  CustomerTeaFormulaHistory,
  LeafCategory,
  CuttingType,
  Customer,
  AddPurchaseBatch,
} from '../models/index.js';
import { customerTeaFormulaSchema } from '@amaravathi/shared-types';
import { ok, created } from '../utils/apiResponse.js';

export const customerTeaFormulasController = {
  async list(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim();
    const customerId = String(req.query.customerId ?? '').trim();
    const leafCategoryId = String(req.query.leafCategoryId ?? '').trim();
    const cuttingTypeId = String(req.query.cuttingTypeId ?? '').trim();
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
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

    const filter: any = {};

    // 1. Customer Filter (route parameter `/customers/:customerId/tea-formulas` or query parameter)
    const activeCustomerId = req.params.customerId || customerId;
    if (activeCustomerId) {
      filter.customerId = activeCustomerId;
    }

    // 2. Leaf Category & Cutting Type Filters
    if (leafCategoryId) {
      filter.leafCategoryId = leafCategoryId;
    }
    if (cuttingTypeId) {
      filter.cuttingTypeId = cuttingTypeId;
    }

    // 3. Search query
    if (q) {
      const matchingCustomers = await Customer.find({ name: { $regex: q, $options: 'i' } }).select('_id').lean();
      const customerIds = matchingCustomers.map(c => c._id);

      filter.$or = [
        { formulaCode: { $regex: q, $options: 'i' } },
        ...(customerIds.length > 0 ? [{ customerId: { $in: customerIds } }] : [])
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
        .populate('leafCategoryId', 'name')
        .populate('cuttingTypeId', 'name basePrice')
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
      .populate('leafCategoryId', 'name')
      .populate('cuttingTypeId', 'name basePrice')
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
    const parsed = customerTeaFormulaSchema.parse(req.body);

    const customer = await Customer.findOne({ _id: parsed.customerId, active: true });
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive Customer.',
      });
    }

    // Duplicate name checking has been intentionally removed along with formulaName
    const combinations = new Set<string>();
    for (const item of parsed.lineItems) {
      const key = `${item.purchaseBatchCode.toLowerCase()}:${item.ingredientName.toLowerCase()}`;
      if (combinations.has(key)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate combination inside formula: "${item.ingredientName}" from Batch "${item.purchaseBatchCode}" is selected multiple times.`,
        });
      }
      combinations.add(key);

      const batch = await AddPurchaseBatch.findOne({ batchCode: item.purchaseBatchCode });
      if (!batch) {
        return res.status(400).json({
          success: false,
          message: `Purchase Batch with code "${item.purchaseBatchCode}" not found.`,
        });
      }
      const batchItem = batch.items.find(
        (bi: any) =>
          bi._id?.toString() === item.purchaseBatchLineItemId ||
          bi.teaPowderType.toLowerCase() === item.ingredientName.toLowerCase()
      );
      if (!batchItem) {
        return res.status(400).json({
          success: false,
          message: `Ingredient "${item.ingredientName}" not found in Purchase Batch "${item.purchaseBatchCode}".`,
        });
      }
      const availableStock = batchItem.availableStockInGrams ?? (batch.numberOfBags * 50000);
      if (item.quantityInGrams > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.ingredientName}" in Batch "${item.purchaseBatchCode}". Requested: ${item.quantityInGrams}g, Available: ${availableStock}g.`,
        });
      }
    }

    let totalWeight = 0;
    let totalFormulaCost = 0;
    const updatedLineItems = await Promise.all(parsed.lineItems.map(async (item) => {
      const batch = await AddPurchaseBatch.findOne({ batchCode: item.purchaseBatchCode });
      const batchItem = batch?.items.find(
        (bi: any) =>
          bi._id?.toString() === item.purchaseBatchLineItemId ||
          bi.teaPowderType.toLowerCase() === item.ingredientName.toLowerCase()
      );
      const pricePerGram = batchItem ? (batchItem.ratePerKg / 1000) : (item.pricePerGram || 0);
      const rowCost = Number((item.quantityInGrams * pricePerGram).toFixed(4));
      totalWeight += item.quantityInGrams;
      totalFormulaCost += rowCost;
      return {
        ...item,
        pricePerGram,
        rowCost,
        purchaseBatchLineItemId: batchItem ? batchItem._id.toString() : item.purchaseBatchLineItemId,
      };
    }));

    totalFormulaCost = Number(totalFormulaCost.toFixed(4));
    totalWeight = Number(totalWeight.toFixed(4));
    const costPerKg = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 1000).toFixed(4)) : 0;
    const costPer100Grams = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 100).toFixed(4)) : 0;

    if (parsed.isDefault) {
      await CustomerTeaFormula.updateMany(
        { customerId: parsed.customerId },
        { isDefault: false },
      );
    }

    const formulaPayload = {
      ...parsed,
      lineItems: updatedLineItems,
      totalWeight,
      totalFormulaCost,
      costPerKg,
      costPer100Grams,
    };

    try {
      const formula = await CustomerTeaFormula.create(formulaPayload);

      await CustomerTeaFormulaHistory.create({
        formulaId: formula._id,
        snapshot: formula.toObject(),
        changedBy: (req as any).user?.id,
        changeType: 'Create',
      });

      return created(res, { ...formula.toObject(), id: formula._id.toString() });
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
    const parsed = customerTeaFormulaSchema.partial().parse(req.body);

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
    const finalLineItems = parsed.lineItems !== undefined ? parsed.lineItems : existingFormula.lineItems;

    if (finalLineItems && finalLineItems.length > 0) {
      const combinations = new Set<string>();
      for (const item of finalLineItems) {
        const key = `${item.purchaseBatchCode.toLowerCase()}:${item.ingredientName.toLowerCase()}`;
        if (combinations.has(key)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate combination inside formula: "${item.ingredientName}" from Batch "${item.purchaseBatchCode}" is selected multiple times.`,
          });
        }
        combinations.add(key);

        const batch = await AddPurchaseBatch.findOne({ batchCode: item.purchaseBatchCode });
        if (!batch) {
          return res.status(400).json({
            success: false,
            message: `Purchase Batch with code "${item.purchaseBatchCode}" not found.`,
          });
        }
        const batchItem = batch.items.find(
          (bi: any) =>
            bi._id?.toString() === item.purchaseBatchLineItemId ||
            bi.teaPowderType.toLowerCase() === item.ingredientName.toLowerCase()
        );
        if (!batchItem) {
          return res.status(400).json({
            success: false,
            message: `Ingredient "${item.ingredientName}" not found in Purchase Batch "${item.purchaseBatchCode}".`,
          });
        }
        const availableStock = batchItem.availableStockInGrams ?? (batch.numberOfBags * 50000);
        if (item.quantityInGrams > availableStock) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${item.ingredientName}" in Batch "${item.purchaseBatchCode}". Requested: ${item.quantityInGrams}g, Available: ${availableStock}g.`,
          });
        }
      }

      let totalWeight = 0;
      let totalFormulaCost = 0;
      const updatedLineItems = await Promise.all(finalLineItems.map(async (item: any) => {
        const batch = await AddPurchaseBatch.findOne({ batchCode: item.purchaseBatchCode });
        const batchItem = batch?.items.find(
          (bi: any) =>
            bi._id?.toString() === item.purchaseBatchLineItemId ||
            bi.teaPowderType.toLowerCase() === item.ingredientName.toLowerCase()
        );
        const pricePerGram = batchItem ? (batchItem.ratePerKg / 1000) : (item.pricePerGram || 0);
        const rowCost = Number((item.quantityInGrams * pricePerGram).toFixed(4));
        totalWeight += item.quantityInGrams;
        totalFormulaCost += rowCost;
        return {
          ...item,
          pricePerGram,
          rowCost,
          purchaseBatchLineItemId: batchItem ? batchItem._id.toString() : item.purchaseBatchLineItemId,
        };
      }));

      totalFormulaCost = Number(totalFormulaCost.toFixed(4));
      totalWeight = Number(totalWeight.toFixed(4));
      const costPerKg = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 1000).toFixed(4)) : 0;
      const costPer100Grams = totalWeight > 0 ? Number(((totalFormulaCost / totalWeight) * 100).toFixed(4)) : 0;

      updatedPayload.lineItems = updatedLineItems;
      updatedPayload.totalWeight = totalWeight;
      updatedPayload.totalFormulaCost = totalFormulaCost;
      updatedPayload.costPerKg = costPerKg;
      updatedPayload.costPer100Grams = costPer100Grams;
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
