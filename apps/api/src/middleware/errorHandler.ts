import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: error.flatten(),
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors,
    });
  }

  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    error.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate value violates a unique constraint',
    });
  }

  const status = typeof error?.status === 'number' ? error.status : 500;
  return res.status(status).json({
    success: false,
    message: error?.message ?? 'Internal server error',
  });
};
