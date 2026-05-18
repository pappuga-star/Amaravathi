import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true },
    address: { type: String, trim: true },
    mobileNumber: { type: String, trim: true },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

customerSchema.pre('validate', function setNameKey(next) {
  this.set('nameKey', normalizeName(this.get('name')));
  next();
});

customerSchema.index({ name: 1 });
customerSchema.index({ deletedAt: 1, active: 1 });
customerSchema.index(
  { nameKey: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
customerSchema.index(
  { mobileNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      mobileNumber: { $exists: true, $type: 'string', $ne: '' },
      deletedAt: null,
    },
  },
);

export const Customer = mongoose.model('Customer', customerSchema);
