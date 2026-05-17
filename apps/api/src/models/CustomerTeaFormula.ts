import mongoose, { Schema } from 'mongoose';

const customerTeaFormulaSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    formulaCode: { type: String, required: true, unique: true },
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
     * Use lineItems for Cutting types instead.
     */
    cuttingTypeId: {
      type: Schema.Types.ObjectId,
      ref: 'CuttingType',
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

// Auto-generate human-readable Formula Code e.g. FORM-20260517-0001
customerTeaFormulaSchema.pre(
  'validate',
  async function generateFormulaCode(next) {
    if (!this.get('formulaCode')) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const date = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${date}`;
      const prefix = `FORM-${dateStr}`;

      const count = await mongoose.model('CustomerTeaFormula').countDocuments({
        formulaCode: new RegExp(`^${prefix}`),
      });

      const suffix = String(count + 1).padStart(4, '0');
      this.set('formulaCode', `${prefix}-${suffix}`);
    }
    next();
  },
);

export const CustomerTeaFormula = mongoose.model(
  'CustomerTeaFormula',
  customerTeaFormulaSchema,
);
