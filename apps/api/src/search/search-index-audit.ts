import type { Model } from 'mongoose';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { Customer } from '../models/Customer.js';
import { CustomerTeaFormula } from '../models/CustomerTeaFormula.js';
import { GeneralItemPurchase } from '../models/GeneralItemPurchase.js';
import { GeneralItemsMaster } from '../models/GeneralItemsMaster.js';
import { Seller } from '../models/Seller.js';
import { TeaPowderType } from '../models/TeaPowderType.js';

const modelExpectations: Array<{ model: Model<any>; expectedIndexes: string[]; atlasFields: string[] }> = [
  { model: Customer, expectedIndexes: ['nameKey_1'], atlasFields: ['name', 'mobileNumber', 'address'] },
  { model: Seller, expectedIndexes: ['nameKey_1'], atlasFields: ['name', 'contactPerson', 'phone', 'email'] },
  { model: TeaPowderType, expectedIndexes: ['nameKey_1'], atlasFields: ['name', 'description'] },
  { model: AddPurchaseBatch, expectedIndexes: ['batchCodeKey_1'], atlasFields: ['batchCode', 'sellerName', 'billNumber', 'lineItems.teaPowderTypeName'] },
  { model: CustomerTeaFormula, expectedIndexes: ['formulaCodeKey_1'], atlasFields: ['formulaCode', 'notes', 'lineItems.ingredientName'] },
  { model: GeneralItemsMaster, expectedIndexes: ['itemNameKey_1'], atlasFields: ['itemName'] },
  { model: GeneralItemPurchase, expectedIndexes: ['supplierNameKey_1'], atlasFields: ['supplierName', 'billNumber', 'lineItems.particulars', 'notes'] },
];

export async function runSearchIndexAudit() {
  const results = [] as any[];

  for (const item of modelExpectations) {
    const indexes = await item.model.collection.indexes();
    const names = new Set(indexes.map((idx) => idx.name));
    const missingIndexes = item.expectedIndexes.filter((name) => !names.has(name));

    const keySignatures = indexes.map((idx) => JSON.stringify(idx.key));
    const duplicateSignatures = keySignatures.filter((signature, index) => keySignatures.indexOf(signature) !== index);

    results.push({
      collection: item.model.collection.collectionName,
      expectedIndexes: item.expectedIndexes,
      presentIndexes: [...names],
      missingIndexes,
      duplicateIndexesByKey: [...new Set(duplicateSignatures)],
      atlasReadinessFields: item.atlasFields,
      atlasReady: item.atlasFields.length > 0,
      recommendations: [
        ...(missingIndexes.length
          ? [`Create missing indexes: ${missingIndexes.join(', ')}`]
          : ['Normalized key indexes present.']),
        ...(duplicateSignatures.length
          ? ['Duplicate index key patterns detected; review index redundancy.']
          : []),
      ],
    });
  }

  return {
    at: new Date().toISOString(),
    results,
  };
}
