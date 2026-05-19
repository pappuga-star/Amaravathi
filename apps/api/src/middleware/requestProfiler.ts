import type { NextFunction, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';
import { env } from '../config/env.js';
import { requestPerformanceContext } from '../utils/requestPerformanceContext.js';

function toFixed(ms: number): string {
  return ms.toFixed(2);
}

export function requestProfiler(req: Request, res: Response, next: NextFunction) {
  if (!env.perfProfilingEnabled) {
    return next();
  }
  const totalStart = performance.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  req._requestId = requestId;
  req._timings = {
    totalStart,
    authMs: 0,
    permissionMs: 0,
    serializationMs: 0,
  };

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const jsonStart = performance.now();
    const result = originalJson(body);
    req._timings!.serializationMs += performance.now() - jsonStart;
    return result;
  }) as Response['json'];

  const originalSend = res.send.bind(res);
  res.send = ((body?: unknown) => {
    const sendStart = performance.now();
    const result = originalSend(body);
    req._timings!.serializationMs += performance.now() - sendStart;
    return result;
  }) as Response['send'];

  const store = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    dbTimeMs: 0,
    dbQueryCount: 0,
    dbLongestMs: 0,
    dbLongestSummary: '',
    dbPoolWaitMs: 0,
    dbPoolCheckouts: 0,
    dbPoolCheckoutFailures: 0,
  };

  requestPerformanceContext.run(store, () => {
    res.on('finish', () => {
      const totalMs = performance.now() - totalStart;
      const timings = req._timings!;
      const breakdown = {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        totalMs: toFixed(totalMs),
        authMs: toFixed(timings.authMs),
        permissionMs: toFixed(timings.permissionMs),
        dbQueryMs: toFixed(store.dbTimeMs),
        dbQueries: store.dbQueryCount,
        dbLongestMs: toFixed(store.dbLongestMs),
        dbLongestQuery: store.dbLongestSummary,
        poolWaitMs: toFixed(store.dbPoolWaitMs),
        poolCheckouts: store.dbPoolCheckouts,
        poolCheckoutFailures: store.dbPoolCheckoutFailures,
        serializationMs: toFixed(timings.serializationMs),
      };

      console.log(`[perf] ${JSON.stringify(breakdown)}`);
    });

    next();
  });
}
