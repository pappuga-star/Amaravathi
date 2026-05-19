export interface SearchHealthSnapshot {
  cacheProvider: string;
  providerMode?: string;
  cacheSize: number;
  cacheHitRatioPct: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  slowQueryCount: number;
  invalidationCount: number;
  activeSearchEngine: string;
  redisConnected: boolean;
  redisPingLatencyMs?: number;
  redisMemoryUsageBytes?: number | null;
  redisReconnectAttempts?: number;
}

export interface SearchMetricsSnapshot {
  totalSearches: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatioPct: number;
  averageResponseTimeMs: number;
  p95LatencyMs: number;
  slowQueries: number;
  invalidationCount: number;
  searchErrors: number;
  topModules: Array<{ module: string; count: number }>;
  topSanitizedTerms: Array<{ term: string; count: number }>;
}

export interface SearchAlert {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  at: string;
}
