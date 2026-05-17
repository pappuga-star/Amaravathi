import mongoose, { Schema } from 'mongoose';

const customerTeaFormulaHistorySchema = new Schema(
  {
    formulaId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerTeaFormula',
      required: true,
    },
    snapshot: { type: Schema.Types.Mixed, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeType: {
      type: String,
      enum: ['Create', 'Update', 'Restore'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const CustomerTeaFormulaHistory = mongoose.model(
  'CustomerTeaFormulaHistory',
  customerTeaFormulaHistorySchema,
);
