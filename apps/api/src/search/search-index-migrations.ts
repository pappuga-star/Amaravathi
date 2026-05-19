import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { Customer } from '../models/Customer.js';
import { CustomerTeaFormula } from '../models/CustomerTeaFormula.js';
import { GeneralItemPurchase } from '../models/GeneralItemPurchase.js';
import { GeneralItemsMaster } from '../models/GeneralItemsMaster.js';
import { Seller } from '../models/Seller.js';
import { TeaPowderType } from '../models/TeaPowderType.js';

export async function ensureSearchIndexes(): Promise<void> {
  await Promise.all([
    Customer.collection.createIndex({ nameKey: 1 }, { name: 'search_nameKey_1' }),
    Seller.collection.createIndex({ nameKey: 1 }, { name: 'search_seller_nameKey_1' }),
    TeaPowderType.collection.createIndex({ nameKey: 1 }, { name: 'search_tea_nameKey_1' }),
    AddPurchaseBatch.collection.createIndex({ batchCodeKey: 1 }, { name: 'search_batch_codeKey_1' }),
    CustomerTeaFormula.collection.createIndex({ formulaCodeKey: 1 }, { name: 'search_formula_codeKey_1' }),
    GeneralItemsMaster.collection.createIndex({ itemNameKey: 1 }, { name: 'search_item_nameKey_1' }),
    GeneralItemPurchase.collection.createIndex({ supplierNameKey: 1 }, { name: 'search_supplier_nameKey_1' }),
  ]);
}
