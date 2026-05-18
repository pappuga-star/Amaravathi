import mongoose, { Schema } from 'mongoose';
import { generateBatchCode } from '@amaravathi/shared-utils';

const purchaseBatchItemSchema = new Schema({
  teaPowderTypeId: { type: Schema.Types.ObjectId, required: true, ref: 'TeaPowderType' },
  teaPowderTypeName: { type: String, required: true, trim: true },
  quantityKg: { type: Number, required: true, min: 0 },
  pricePerKg: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  availableStockInGrams: { type: Number, default: 0, min: 0 },
});

const purchaseBatchSchema = new Schema(
  {
    serialNumber: { type: Number, required: true, unique: true },
    numberOfBags: { type: Number, required: true, min: 1 },
    purchaseDate: { type: Date, required: true },
    billNumber: { type: String, required: true, trim: true },
    sellerId: { type: Schema.Types.ObjectId, required: false, ref: 'Seller', default: null },
    sellerName: { type: String, required: false, trim: true, default: '' },
    batchCode: { type: String, required: true, trim: true, unique: true },
    lineItems: { type: [purchaseBatchItemSchema], default: [] },
    totalQuantityKg: { type: Number, required: true, min: 0, default: 0 },
    totalBatchAmount: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

purchaseBatchSchema.index({ purchaseDate: -1 });
purchaseBatchSchema.index({ sellerName: 1 });
purchaseBatchSchema.index({ billNumber: 1 });
purchaseBatchSchema.index({ 'lineItems.teaPowderTypeName': 1 });
purchaseBatchSchema.index({ purchaseDate: -1, createdAt: -1 });

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

  // Legacy compatibility: migrate old "items" into new "lineItems" during save.
  if ((!doc.lineItems || doc.lineItems.length === 0) && Array.isArray(doc.items)) {
    doc.lineItems = doc.items.map((legacy: any) => ({
      teaPowderTypeId: legacy.teaPowderTypeId,
      teaPowderTypeName: legacy.teaPowderTypeName ?? legacy.teaPowderType,
      quantityKg: Number(legacy.quantityKg ?? 1),
      pricePerKg: Number(legacy.pricePerKg ?? legacy.ratePerKg ?? 0),
      totalAmount: Number(legacy.totalAmount ?? 0),
      availableStockInGrams: Number(legacy.availableStockInGrams ?? 0),
    }));
  }

  let totalQuantityKg = 0;
  let totalBatchAmount = 0;
  const bagStock = (doc.numberOfBags || 0) * 50000;

  doc.lineItems = (doc.lineItems || []).map((item: any) => {
    const quantityKg = Number(item.quantityKg ?? 0);
    const pricePerKg = Number(item.pricePerKg ?? 0);
    const totalAmount = Number((quantityKg * pricePerKg).toFixed(2));
    const availableStockInGrams =
      item.availableStockInGrams && Number(item.availableStockInGrams) > 0
        ? Number(item.availableStockInGrams)
        : Math.round(quantityKg * 1000) || bagStock;

    totalQuantityKg += quantityKg;
    totalBatchAmount += totalAmount;

    return {
      ...item,
      quantityKg,
      pricePerKg,
      totalAmount,
      availableStockInGrams,
    };
  });
  doc.totalQuantityKg = Number(totalQuantityKg.toFixed(3));
  doc.totalBatchAmount = Number(totalBatchAmount.toFixed(2));

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
