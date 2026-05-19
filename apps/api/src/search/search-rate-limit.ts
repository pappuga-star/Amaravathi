import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function keyFor(req: Request, scope: string): string {
  const user = req.user?.id ?? req.ip ?? 'anonymous';
  return `${scope}:${user}`;
}

function isLimited(req: Request, scope: string, limit: number): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const key = keyFor(req, scope);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { limited: false, retryAfter: 60 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  return { limited: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
}

export function searchRateLimit(scope = 'search', limit = env.searchRateLimitPerMinute) {
  return (req: Request, res: Response, next: NextFunction) => {
    const decision = isLimited(req, scope, limit);
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', decision.limited ? '0' : '1');
    res.setHeader('Retry-After', String(decision.retryAfter));

    if (decision.limited) {
      return res.status(429).json({
        success: false,
        message: 'Search rate limit exceeded. Please retry shortly.',
      });
    }
    return next();
  };
}

export const globalSearchRateLimit = () =>
  searchRateLimit('global-search', env.searchGlobalRateLimitPerMinute);
