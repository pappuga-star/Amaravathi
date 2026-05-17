import mongoose, { Schema } from 'mongoose';
import { generateBatchCode } from '@amaravathi/shared-utils';

const purchaseBatchItemSchema = new Schema({
  subSerialNumber: { type: Number, required: true },
  teaPowderType: { type: String, required: true, trim: true },
  ratePerKg: { type: Number, required: true, min: 0 },
  ingredientCategory: {
    type: String,
    enum: ['Leaf', 'Add-On'],
    default: 'Leaf',
  },
  pricePerGram: { type: Number, default: 0 },
  availableStockInGrams: { type: Number, default: 0 },
});

const purchaseBatchSchema = new Schema(
  {
    serialNumber: { type: Number, required: true, unique: true },
    numberOfBags: { type: Number, required: true, min: 1 },
    purchaseDate: { type: Date, required: true },
    billNumber: { type: String, required: true, trim: true },
    sellerName: { type: String, required: true, trim: true },
    batchCode: { type: String, required: true, trim: true, unique: true },
    items: [purchaseBatchItemSchema],
  },
  { timestamps: true },
);

purchaseBatchSchema.index({ purchaseDate: -1 });
purchaseBatchSchema.index({ sellerName: 1 });
purchaseBatchSchema.index({ billNumber: 1 });
purchaseBatchSchema.index({ 'items.teaPowderType': 1 });

purchaseBatchSchema.pre('validate', async function setAutoFields(next) {
  const doc = this as any;
  if (doc.isNew) {
    if (!doc.serialNumber) {
      const lastBatch = await AddPurchaseBatch.findOne(
        {},
        { serialNumber: 1 },
      ).sort({ serialNumber: -1 });
      doc.serialNumber = (lastBatch?.serialNumber ?? 0) + 1;
    }
  }

  // Re-number items to ensure correctness and dynamic re-numbering
  doc.items.forEach((item: any, index: number) => {
    item.subSerialNumber = index + 1;

    // Auto-calculate pricePerGram based on ratePerKg
    if (item.ratePerKg !== undefined) {
      item.pricePerGram = item.ratePerKg / 1000;
    }

    // Auto-set availableStockInGrams if zero/unset (50kg per bag standard default)
    if (
      item.availableStockInGrams === undefined ||
      item.availableStockInGrams === 0
    ) {
      item.availableStockInGrams = (doc.numberOfBags || 1) * 50000;
    }

    // Auto-classify category: if name includes color, dust, addon, lumpsa, flavor, set Add-On, else Leaf
    if (!item.ingredientCategory) {
      const name = (item.teaPowderType || '').toLowerCase();
      if (
        name.includes('color') ||
        name.includes('dust') ||
        name.includes('lumsa') ||
        name.includes('addon') ||
        name.includes('lumpsa') ||
        name.includes('flavor')
      ) {
        item.ingredientCategory = 'Add-On';
      } else {
        item.ingredientCategory = 'Leaf';
      }
    }
  });

  const baseCode = generateBatchCode(doc.numberOfBags, doc.purchaseDate);
  if (
    doc.isNew ||
    doc.isModified('numberOfBags') ||
    doc.isModified('purchaseDate')
  ) {
    let finalCode = baseCode;
    let suffix = 1;
    let exists = true;
    while (exists) {
      const query: any = { batchCode: finalCode };
      if (!doc.isNew) {
        query._id = { $ne: doc._id };
      }
      const duplicate = await mongoose.model('AddPurchaseBatch').findOne(query);
      if (duplicate) {
        suffix++;
        finalCode = `${baseCode}-${suffix}`;
      } else {
        exists = false;
      }
    }
    doc.batchCode = finalCode;
  }

  next();
});

export const AddPurchaseBatch = mongoose.model(
  'AddPurchaseBatch',
  purchaseBatchSchema,
);
