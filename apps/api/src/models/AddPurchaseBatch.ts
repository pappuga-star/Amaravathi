import { Schema, model } from 'mongoose';
import { generateBatchCode, normalizeName } from '@amaravathi/shared-utils';

const purchaseBatchItemSchema = new Schema({
  teaPowderTypeId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'TeaPowderType',
  },
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
    sellerId: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'Seller',
      default: null,
    },
    sellerName: { type: String, required: false, trim: true, default: '' },
    batchCode: { type: String, required: true, trim: true },
    batchCodeKey: { type: String, required: true, trim: true },
    lineItems: { type: [purchaseBatchItemSchema], default: [] },
    totalQuantityKg: { type: Number, required: true, min: 0, default: 0 },
    totalBatchAmount: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

purchaseBatchSchema.index({ purchaseDate: -1 });
purchaseBatchSchema.index({ sellerName: 1 });
purchaseBatchSchema.index({ billNumber: 1 });
purchaseBatchSchema.index({ batchCode: 1 });
purchaseBatchSchema.index({ batchCodeKey: 1 });
purchaseBatchSchema.index({ 'lineItems._id': 1 });
purchaseBatchSchema.index({ 'lineItems.teaPowderTypeName': 1 });
purchaseBatchSchema.index({ purchaseDate: -1, createdAt: -1 });
purchaseBatchSchema.index(
  { purchaseDate: 1, sellerName: 1, billNumber: 1 },
  { unique: true, name: 'uniq_purchase_batch_identity' },
);

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
  if (
    (!doc.lineItems || doc.lineItems.length === 0) &&
    Array.isArray(doc.items)
  ) {
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
    doc.batchCode = baseCode;
  }
  doc.batchCodeKey = normalizeName(doc.batchCode ?? '');

  next();
});

export const AddPurchaseBatch = model('AddPurchaseBatch', purchaseBatchSchema);
