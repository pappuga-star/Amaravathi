import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const leafCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

leafCategorySchema.pre('validate', function setNameKey(next) {
  this.set('nameKey', normalizeName(this.get('name')));
  next();
});

leafCategorySchema.index({ name: 1 });
leafCategorySchema.index({ active: 1, deletedAt: 1 });

export const LeafCategory = mongoose.model('LeafCategory', leafCategorySchema);
