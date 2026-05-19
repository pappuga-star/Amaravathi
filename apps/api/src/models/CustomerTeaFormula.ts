import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const formulaCodeCounterSchema = new Schema(
  {
    prefix: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: 'formula_code_counters', timestamps: false },
);

type FormulaCodeCounterDoc = {
  prefix: string;
  seq: number;
};

const FormulaCodeCounter =
  (mongoose.models.FormulaCodeCounter as mongoose.Model<FormulaCodeCounterDoc>) ??
  mongoose.model<FormulaCodeCounterDoc>(
    'FormulaCodeCounter',
    formulaCodeCounterSchema,
  );

function getFormulaPrefix(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `FORM-${year}${month}${day}`;
}

async function getNextFormulaCode(prefix: string): Promise<string> {
  // Atomic sequence increment per daily prefix.
  const counter = await FormulaCodeCounter.findOneAndUpdate(
    { prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  const seq = Number(counter?.seq ?? 1);
  const suffix = String(seq).padStart(4, '0');
  return `${prefix}-${suffix}`;
}

const customerTeaFormulaSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    formulaCode: { type: String, required: true, unique: true },
    formulaCodeKey: { type: String, required: true, trim: true },
    totalWeight: { type: Number, required: true, min: 0 },
    totalFormulaCost: { type: Number, required: true, min: 0 },
    costPerKg: { type: Number, required: true, min: 0 },
    costPer100Grams: { type: Number, required: true, min: 0 },
    lineItems: [
      {
        purchaseBatchCode: { type: String, required: true },
        purchaseBatchLineItemId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        ingredientCategory: {
          type: String,
          enum: ['Leaf', 'Add-On'],
          required: true,
        },
        ingredientName: { type: String, required: true },
        quantityInGrams: { type: Number, required: true, min: 0 },
        pricePerGram: { type: Number, required: true, min: 0 },
        rowCost: { type: Number, required: true, min: 0 },
      },
    ],
    /**
     * @deprecated Legacy field maintained for backwards compatibility with old records.
     * Use lineItems for Leaf categories instead.
     */
    leafCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'LeafCategory',
      required: false,
    },
    /**
     * @deprecated Legacy field maintained for backwards compatibility with old records.
     * Use lineItems for Add-ons instead.
     */
    addons: [
      {
        name: { type: String, trim: true },
        price: { type: Number, min: 0 },
        gramsPerKg: { type: Number, min: 0 },
      },
    ],
    /**
     * @deprecated Legacy field maintained for backwards compatibility with old records.
     * Use totalFormulaCost instead.
     */
    finalPrice: { type: Number, min: 0 },
    /**
     * @deprecated Legacy field maintained for backwards compatibility with old records.
     */
    marginPercent: { type: Number },
    isDefault: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerTeaFormulaSchema.index({ customerId: 1 });
customerTeaFormulaSchema.index({ status: 1 });
customerTeaFormulaSchema.index({ deletedAt: 1 });
customerTeaFormulaSchema.index({ status: 1, deletedAt: 1 });
customerTeaFormulaSchema.index({ isDefault: 1 });
customerTeaFormulaSchema.index({ createdAt: -1 });
customerTeaFormulaSchema.index({ customerId: 1, deletedAt: 1, status: 1, createdAt: -1 });
customerTeaFormulaSchema.index({ status: 1, createdAt: -1 });
customerTeaFormulaSchema.index({ 'lineItems.purchaseBatchLineItemId': 1 });
customerTeaFormulaSchema.index({ formulaCodeKey: 1 });


// Auto-generate human-readable Formula Code e.g. FORM-20260517-0001
customerTeaFormulaSchema.pre(
  'validate',
  async function generateFormulaCode(next) {
    if (!this.get('formulaCode')) {
      const prefix = getFormulaPrefix(new Date());
      const candidate = await getNextFormulaCode(prefix);
      this.set('formulaCode', candidate);
    }
    this.set('formulaCodeKey', normalizeName(this.get('formulaCode')));
    next();
  },
);

export const CustomerTeaFormula = mongoose.model(
  'CustomerTeaFormula',
  customerTeaFormulaSchema,
);
