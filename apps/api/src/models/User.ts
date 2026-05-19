import bcrypt from 'bcryptjs';
import mongoose, { Schema } from 'mongoose';
import { roles, type Role } from '@amaravathi/shared-types';

export type UserDocument = mongoose.Document & {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  forcePasswordChange: boolean;
  comparePassword(password: string): Promise<boolean>;
};

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: roles,
      default: 'viewer',
      required: true,
    },
    active: { type: Boolean, default: true },
    forcePasswordChange: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function comparePassword(
  password: string,
) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.index({ name: 1 });
userSchema.index({ active: 1 });

export const User = mongoose.model<UserDocument>('User', userSchema);
