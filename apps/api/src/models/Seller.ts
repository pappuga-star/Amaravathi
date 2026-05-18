import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const sellerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

sellerSchema.pre('validate', function setNameKey(next) {
  this.set('nameKey', normalizeName(this.get('name')));
  next();
});

sellerSchema.index({ name: 1 });
sellerSchema.index({ active: 1 });

export const Seller = mongoose.model('Seller', sellerSchema);
