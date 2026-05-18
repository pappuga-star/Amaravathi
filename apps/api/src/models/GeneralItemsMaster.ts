import mongoose, { Schema } from 'mongoose';

const generalItemsMasterSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    defaultUnit: {
      type: String,
      required: true,
      enum: ['Kg', 'Grams', 'Pieces', 'Boxes', 'Packets', 'Dozens', 'Liters'],
    },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'general_items_master' },
);

generalItemsMasterSchema.index({ itemName: 1 }, { unique: true });
generalItemsMasterSchema.index({ isActive: 1 });
generalItemsMasterSchema.index({ deletedAt: 1 });

export const GeneralItemsMaster = mongoose.model(
  'GeneralItemsMaster',
  generalItemsMasterSchema,
);
