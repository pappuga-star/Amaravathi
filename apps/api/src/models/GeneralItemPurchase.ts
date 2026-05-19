import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const generalItemLineSchema = new Schema(
  {
    particulars: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      required: true,
      enum: ['Kg', 'Grams', 'Pieces', 'Boxes', 'Packets', 'Dozens', 'Liters'],
    },
    ratePerUnit: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const generalItemPurchaseSchema = new Schema(
  {
    purchaseDate: { type: Date, required: true },
    billNumber: { type: String, trim: true, default: '' },
    supplierName: { type: String, required: true, trim: true },
    supplierNameKey: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '' },
    lineItems: { type: [generalItemLineSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'general_item_purchases' },
);

generalItemPurchaseSchema.index({ purchaseDate: -1 });
generalItemPurchaseSchema.index({ supplierName: 1 });
generalItemPurchaseSchema.index({ supplierNameKey: 1 });
generalItemPurchaseSchema.index({ 'lineItems.particulars': 1 });
generalItemPurchaseSchema.index({ billNumber: 1 });
generalItemPurchaseSchema.index({ deletedAt: 1 });
generalItemPurchaseSchema.index({ deletedAt: 1, purchaseDate: -1 });
generalItemPurchaseSchema.index({ deletedAt: 1, supplierName: 1, purchaseDate: -1 });

generalItemPurchaseSchema.pre('validate', function preValidate(next) {
  const doc = this as any;
  doc.supplierNameKey = normalizeName(doc.supplierName ?? '');
  let total = 0;
  doc.lineItems = (doc.lineItems || []).map((item: any) => {
    const quantity = Number(item.quantity ?? 0);
    const ratePerUnit = Number(item.ratePerUnit ?? 0);
    const amount = Number((quantity * ratePerUnit).toFixed(2));
    total += amount;
    return {
      ...item,
      quantity,
      ratePerUnit,
      amount,
    };
  });
  doc.totalAmount = Number(total.toFixed(2));
  next();
});

export const GeneralItemPurchase = mongoose.model(
  'GeneralItemPurchase',
  generalItemPurchaseSchema,
);
