import mongoose, { Schema } from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';

const teaPowderTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameKey: { type: String, required: true, unique: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teaPowderTypeSchema.pre('validate', function setNameKey(next) {
  this.set('nameKey', normalizeName(this.get('name')));
  next();
});

export const TeaPowderType = mongoose.model(
  'TeaPowderType',
  teaPowderTypeSchema,
);
