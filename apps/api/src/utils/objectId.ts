import mongoose from 'mongoose';

export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export function toObjectId(value: unknown, fieldName = 'ObjectId'): mongoose.Types.ObjectId {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (!raw) {
    throw new AppError(`Invalid ${fieldName} value.`, 400);
  }
  const normalized = String(raw);
  if (!mongoose.Types.ObjectId.isValid(normalized)) {
    throw new AppError(`Invalid ${fieldName} value.`, 400);
  }
  return new mongoose.Types.ObjectId(normalized);
}
