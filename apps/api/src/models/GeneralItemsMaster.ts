import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const generalItemsMasterSchema = new Schema(
  {
    itemName: { type: String, required: true, trim: true },
    itemNameKey: { type: String, required: true, trim: true },
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

generalItemsMasterSchema.pre('validate', function setItemNameKey(next) {
  this.set('itemNameKey', normalizeName(this.get('itemName')));
  next();
});

generalItemsMasterSchema.index(
  { itemName: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
generalItemsMasterSchema.index(
  { itemNameKey: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
generalItemsMasterSchema.index({ isActive: 1 });
generalItemsMasterSchema.index({ deletedAt: 1 });

export const GeneralItemsMaster = mongoose.model(
  'GeneralItemsMaster',
  generalItemsMasterSchema,
);
