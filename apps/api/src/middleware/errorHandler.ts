import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { searchMetrics } from '../search/search-metrics.js';

function zodIssuesToFieldMap(error: ZodError): Record<string, string> {
  return error.issues.reduce(
    (acc, issue) => {
      const key = issue.path.length ? issue.path.join('.') : 'root';
      if (!acc[key]) {
        acc[key] = issue.message;
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (req.path.includes('search') || req.path.includes('customer-tea-formulas') || req.path.includes('sellers') || req.path.includes('customers')) {
    searchMetrics.recordError();
  }
  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: zodIssuesToFieldMap(error),
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
