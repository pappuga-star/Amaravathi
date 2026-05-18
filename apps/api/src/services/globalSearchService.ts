import { Customer } from '../models/Customer.js';
import { CustomerTeaFormula } from '../models/CustomerTeaFormula.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { Seller } from '../models/Seller.js';
import { TeaPowderType } from '../models/TeaPowderType.js';

export interface SearchResultItem {
  _id: string;
  label: string;
  type: string;
  subtitle: string;
  route: string;
}

export interface GroupedSearchResults {
  customers: SearchResultItem[];
  savedBlends: SearchResultItem[];
  customerTeaBlends: SearchResultItem[];
  purchaseBatches: SearchResultItem[];
  batchIngredients: SearchResultItem[];
  teaPowderTypes: SearchResultItem[];
  suppliers: SearchResultItem[];
}

const searchCache = new Map<string, { timestamp: number; data: GroupedSearchResults }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const globalSearchService = {
  async search(query: string, userRole: string): Promise<GroupedSearchResults> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return { customers: [], savedBlends: [], customerTeaBlends: [], purchaseBatches: [], batchIngredients: [], suppliers: [], teaPowderTypes: [] };
    }

    const cacheKey = `${userRole}:${trimmedQuery.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const escapedQuery = trimmedQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp('^' + escapedQuery, 'i');
    const containsRegex = new RegExp(escapedQuery, 'i'); // for nested arrays where anchored doesn't work well
    const isViewer = userRole === 'viewer';

    // Parallel queries
    const [
      formulasData,
      batchesData,
      customersData,
      sellersData,
      inventoryData
    ] = await Promise.all([
      CustomerTeaFormula.find({
        deletedAt: null,
        $or: [
          { formulaCode: regex },
          { notes: regex },
          { 'lineItems.ingredientName': regex },
        ],
      })
        .select('_id formulaCode costPerKg customerId notes lineItems')
        .populate('customerId', 'name')
        .limit(10)
        .lean(),

      AddPurchaseBatch.find({
        $or: [
          { batchCode: regex },
          { billNumber: regex },
          { sellerName: regex },
          { 'lineItems.teaPowderTypeName': containsRegex }
        ],
      })
        .select('_id batchCode sellerName billNumber numberOfBags lineItems')
        .limit(10)
        .lean(),

      isViewer ? Promise.resolve([]) : Customer.find({
        deletedAt: null,
        $or: [
          { name: regex },
          { mobileNumber: regex },
          { address: regex },
        ],
      })
        .select('_id name mobileNumber address')
        .limit(10)
        .lean(),

      isViewer ? Promise.resolve([]) : Seller.find({
        $or: [
          { name: regex },
          { contactPerson: regex },
          { phone: regex },
          { email: regex },
        ],
      })
        .select('_id name contactPerson phone')
        .limit(10)
        .lean(),

      isViewer ? Promise.resolve([]) : TeaPowderType.find({
        active: true,
        $or: [
          { name: regex },
          { description: regex },
        ],
      })
        .select('_id name description')
        .limit(10)
        .lean()
    ]);

    const savedBlends = formulasData.map((f: any) => ({
      _id: f._id.toString() + '-view',
      label: f.formulaCode,
      type: 'savedBlend',
      subtitle: `Customer: ${f.customerId?.name || 'Unknown'} • Notes: ${f.notes || 'N/A'}`,
      route: `/taste-customization?tab=saved-formulas&viewId=${f._id}`,
    }));

    const customerTeaBlends = formulasData.map((f: any) => ({
      _id: f._id.toString() + '-edit',
      label: f.formulaCode,
      type: 'customerTeaBlend',
      subtitle: `Customer: ${f.customerId?.name || 'Unknown'} • Edit Blend`,
      route: `/customer-formulas/edit/${f._id}`,
    }));

    const purchaseBatches = batchesData.map((b: any) => ({
      _id: b._id.toString(),
      label: b.batchCode,
      type: 'purchaseBatch',
      subtitle: `Supplier: ${b.sellerName} • Bill: ${b.billNumber} • Bags: ${b.numberOfBags}`,
      route: `/purchase-batch?q=${encodeURIComponent(b.batchCode)}`,
    }));

    const batchIngredients: SearchResultItem[] = [];
    batchesData.forEach((b: any) => {
      b.lineItems?.forEach((item: any) => {
        if (
          item.teaPowderTypeName?.match(containsRegex)
        ) {
          batchIngredients.push({
            _id: `${b._id.toString()}-${item._id || item.teaPowderTypeName}`,
            label: item.teaPowderTypeName || 'Unknown Ingredient',
            type: 'batchIngredient',
            subtitle: `Batch: ${b.batchCode} • Quantity: ${item.quantityKg || 0}kg • Price: ₹${item.pricePerKg || 0}/kg`,
            route: `/purchase-batch?tab=purchase-batches&viewId=${b._id}`,
          });
        }
      });
    });

    const customers = customersData.map((c: any) => ({
      _id: c._id.toString(),
      label: c.name,
      type: 'customer',
      subtitle: `Mobile: ${c.mobileNumber || 'N/A'} • Address: ${c.address || 'N/A'}`,
      route: `/taste-customization?tab=customers&q=${encodeURIComponent(c.name)}`,
    }));

    const suppliers = sellersData.map((s: any) => ({
      _id: s._id.toString(),
      label: s.name,
      type: 'supplier',
      subtitle: `Contact: ${s.contactPerson || 'N/A'} • Phone: ${s.phone || 'N/A'}`,
      route: `/sellers?q=${encodeURIComponent(s.name)}`,
    }));

    const teaPowderTypes = inventoryData.map((item: any) => ({
      _id: item._id.toString(),
      label: item.name,
      type: 'teaPowderType',
      subtitle: `Inventory Type • ${item.description || 'No description'}`,
      route: `/purchase-batch?tab=types&q=${encodeURIComponent(item.name)}`,
    }));

    const responseData: GroupedSearchResults = {
      customers,
      savedBlends,
      customerTeaBlends,
      purchaseBatches,
      batchIngredients: batchIngredients.slice(0, 10),
      suppliers,
      teaPowderTypes
    };

    searchCache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    return responseData;
  },
};
