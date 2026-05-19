import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { performance } from 'node:perf_hooks';
import type { Role } from '@amaravathi/shared-types';
import { env } from '../config/env.js';

type AuthUser = { id: string; role: Role; email: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  const header = req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    if (req._timings) req._timings.authMs += performance.now() - start;
    return res
      .status(401)
      .json({ success: false, message: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    if (req._timings) req._timings.authMs += performance.now() - start;
    return next();
  } catch {
    if (req._timings) req._timings.authMs += performance.now() - start;
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
}

export function permit(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    if (!req.user || !roles.includes(req.user.role)) {
      if (req._timings) req._timings.permissionMs += performance.now() - start;
      return res
        .status(403)
        .json({ success: false, message: 'Permission denied' });
    }
    if (req._timings) req._timings.permissionMs += performance.now() - start;
    return next();
  };
}
