import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

export function validateObjectIdParam(paramName: string) {
  return (
    _req: Request,
    res: Response,
    next: NextFunction,
    value: string,
  ) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
      });
    }
    return next();
  };
}
