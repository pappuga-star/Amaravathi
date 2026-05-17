import mongoose, { Document, Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

export interface ICuttingType extends Document {
  name: string;
  nameKey: string;
  basePrice: number;
  leafCategoryId: mongoose.Types.ObjectId;
  description?: string;
  active: boolean;
  deletedAt?: Date | null;
}

const cuttingTypeSchema = new Schema<ICuttingType>(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true },
    basePrice: { type: Number, required: true },
    leafCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'LeafCategory',
      required: true,
    },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

cuttingTypeSchema.pre('validate', function setNameKey(next) {
  this.set('nameKey', normalizeName(this.get('name')));
  next();
});

export const CuttingType = mongoose.model<ICuttingType>('CuttingType', cuttingTypeSchema);
