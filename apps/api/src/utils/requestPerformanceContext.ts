import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestPerformanceStore = {
  requestId: string;
  method: string;
  path: string;
  dbTimeMs: number;
  dbQueryCount: number;
  dbLongestMs: number;
  dbLongestSummary: string;
  dbPoolWaitMs: number;
  dbPoolCheckouts: number;
  dbPoolCheckoutFailures: number;
};

export const requestPerformanceContext =
  new AsyncLocalStorage<RequestPerformanceStore>();

export function getRequestPerformanceStore(): RequestPerformanceStore | undefined {
  return requestPerformanceContext.getStore();
}
