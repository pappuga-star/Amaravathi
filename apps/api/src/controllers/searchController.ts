import type { Request, Response } from 'express';
import { CustomerTeaFormula } from '../models/CustomerTeaFormula.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { Customer } from '../models/Customer.js';
import { LeafCategory } from '../models/LeafCategory.js';
import { isSearchQueryPresent } from '@amaravathi/shared-utils';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function globalSearch(req: Request, res: Response) {
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q : undefined;
    if (!isSearchQueryPresent(rawQ)) {
      return res.json({
        success: true,
        data: {
          tasteCustomizations: [],
          purchaseBatches: [],
          customers: [],
        },
      });
    }

    const q = String(rawQ).trim();

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
    // Find matching Customers and Leaf Categories first to resolve reference joins
    const [matchingCustomers, matchingLeaves] =
      await Promise.all([
        Customer.find({ name: regexQuery, deletedAt: null }).select('_id').lean(),
        LeafCategory.find({ name: regexQuery, deletedAt: null }).select('_id').lean(),
      ]);

    const customerIds = matchingCustomers.map((c) => c._id);
    const leafIds = matchingLeaves.map((l) => l._id);

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
        ...numericFilter,
      ],
    })
      .select('formulaCode customerId leafCategoryId finalPrice status')
      .populate('customerId', 'name')
      .populate('leafCategoryId', 'name')
      .limit(10)
      .lean();

    results.tasteCustomizations = formulas.map((f: any) => ({
      id: f._id.toString(),
      formulaCode: f.formulaCode,
      customerName: f.customerId?.name || 'Unknown',
      leafCategoryName: f.leafCategoryId?.name || 'Unknown',
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
        { 'lineItems.teaPowderTypeName': regexQuery },
        ...batchNumericFilters,
      ],
    })
      .select('serialNumber batchCode billNumber sellerName purchaseDate numberOfBags')
      .limit(10)
      .lean();

    results.purchaseBatches = batches.map((b: any) => ({
      id: b._id.toString(),
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
      })
        .select('name mobileNumber address active')
        .limit(10)
        .lean();

      results.customers = dbCustomers.map((c: any) => ({
        id: c._id.toString(),
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
