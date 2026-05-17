import type { Request, Response } from 'express';
import { CustomerTeaFormula } from '../models/CustomerTeaFormula.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { Customer } from '../models/Customer.js';
import { LeafCategory } from '../models/LeafCategory.js';
import { CuttingType } from '../models/CuttingType.js';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function globalSearch(req: Request, res: Response) {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: {
          tasteCustomizations: [],
          purchaseBatches: [],
          customers: [],
        },
      });
    }

    const regexQuery = new RegExp(escapeRegex(q), 'i');
    const userRole = req.user?.role;

    const results: {
      tasteCustomizations: any[];
      purchaseBatches: any[];
      customers: any[];
    } = {
      tasteCustomizations: [],
      purchaseBatches: [],
      customers: [],
    };

    // 1. Search Customer Customizations (Allowed for everyone: admin, pricing_manager, operator, viewer)
    // Find matching Customers, Leaf Categories, and Cutting Types first to resolve reference joins
    const [matchingCustomers, matchingLeaves, matchingCuttings] =
      await Promise.all([
        Customer.find({ name: regexQuery, deletedAt: null }).select('_id'),
        LeafCategory.find({ name: regexQuery, deletedAt: null }).select('_id'),
        CuttingType.find({ name: regexQuery, deletedAt: null }).select('_id'),
      ]);

    const customerIds = matchingCustomers.map((c) => c._id);
    const leafIds = matchingLeaves.map((l) => l._id);
    const cuttingIds = matchingCuttings.map((c) => c._id);

    const numericVal = Number(q);
    const numericFilter: any[] = [];
    if (!isNaN(numericVal)) {
      numericFilter.push({ finalPrice: numericVal });
    }

    const formulas = await CustomerTeaFormula.find({
      deletedAt: null,
      $or: [
        { formulaCode: regexQuery },
        { notes: regexQuery },
        { customerId: { $in: customerIds } },
        { leafCategoryId: { $in: leafIds } },
        { cuttingTypeId: { $in: cuttingIds } },
        ...numericFilter,
      ],
    })
      .populate('customerId')
      .populate('leafCategoryId')
      .populate('cuttingTypeId')
      .limit(10);

    results.tasteCustomizations = formulas.map((f: any) => ({
      id: f._id,
      formulaCode: f.formulaCode,
      customerName: f.customerId?.name || 'Unknown',
      leafCategoryName: f.leafCategoryId?.name || 'Unknown',
      cuttingTypeName: f.cuttingTypeId?.name || 'Unknown',
      finalPrice: f.finalPrice,
      status: f.status,
    }));

    // 2. Search Purchase Batches (Allowed for everyone: admin, pricing_manager, operator, viewer)
    const batchNumericFilters: any[] = [];
    if (!isNaN(numericVal)) {
      batchNumericFilters.push({ serialNumber: numericVal });
    }

    const batches = await AddPurchaseBatch.find({
      $or: [
        { batchCode: regexQuery },
        { billNumber: regexQuery },
        { sellerName: regexQuery },
        { 'items.teaPowderType': regexQuery },
        ...batchNumericFilters,
      ],
    }).limit(10);

    results.purchaseBatches = batches.map((b: any) => ({
      id: b._id,
      serialNumber: b.serialNumber,
      batchCode: b.batchCode,
      billNumber: b.billNumber,
      sellerName: b.sellerName,
      purchaseDate: b.purchaseDate,
      numberOfBags: b.numberOfBags,
    }));

    // 3. Search Customers (RESTRICTED: Denied for viewer, allowed for admin, pricing_manager, operator)
    if (userRole !== 'viewer') {
      const dbCustomers = await Customer.find({
        deletedAt: null,
        $or: [
          { name: regexQuery },
          { mobileNumber: regexQuery },
          { address: regexQuery },
        ],
      }).limit(10);

      results.customers = dbCustomers.map((c: any) => ({
        id: c._id,
        name: c.name,
        mobileNumber: c.mobileNumber || 'N/A',
        address: c.address || 'N/A',
        active: c.active,
      }));
    }

    return res.json({
      success: true,
      data: results,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Global search failed.',
    });
  }
}
