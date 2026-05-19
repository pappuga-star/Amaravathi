import 'dotenv/config';

function toBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function toPositiveNumber(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toEnum<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: process.env.MONGODB_URI ?? '', // validated at startup in connectDatabase()
  jwtSecret: process.env.JWT_SECRET ?? 'local-development-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  seedOnStartup: toBoolean(process.env.SEED_ON_STARTUP, false),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? '',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? '',
  seedOperatorEmail: process.env.SEED_OPERATOR_EMAIL ?? '',
  seedOperatorPassword: process.env.SEED_OPERATOR_PASSWORD ?? '',
  seedViewerEmail: process.env.SEED_VIEWER_EMAIL ?? '',
  seedViewerPassword: process.env.SEED_VIEWER_PASSWORD ?? '',
  cacheMaxEntries: toPositiveNumber(process.env.CACHE_MAX_ENTRIES) ?? 500,
  cacheTtlMs: toPositiveNumber(process.env.CACHE_TTL_MS),
  searchEngine:
    toEnum(process.env.SEARCH_ENGINE, ['atlas', 'prefix', 'regex'] as const, 'prefix'),
  searchEnableAtlasFallback: toBoolean(process.env.SEARCH_ENABLE_ATLAS_FALLBACK, true),
  searchAtlasIndexName: process.env.SEARCH_ATLAS_INDEX_NAME?.trim() || 'default',
  searchCacheProvider: toEnum(process.env.SEARCH_CACHE_PROVIDER, ['memory', 'redis'] as const, 'memory'),
  redisUrl: process.env.REDIS_URL?.trim() ?? '',
  redisConnectTimeoutMs: toPositiveNumber(process.env.REDIS_CONNECT_TIMEOUT_MS) ?? 5000,
  redisMaxRetries: toPositiveNumber(process.env.REDIS_MAX_RETRIES) ?? 10,
  redisPingTimeoutMs: toPositiveNumber(process.env.REDIS_PING_TIMEOUT_MS) ?? 1000,
  searchSlowQueryMs: toPositiveNumber(process.env.SEARCH_SLOW_QUERY_MS) ?? 500,
  searchRateLimitPerMinute: toPositiveNumber(process.env.SEARCH_RATE_LIMIT_PER_MINUTE) ?? 60,
  searchGlobalRateLimitPerMinute: toPositiveNumber(process.env.SEARCH_GLOBAL_RATE_LIMIT_PER_MINUTE) ?? 40,
  searchAlertMinHitRatioPct: toPositiveNumber(process.env.SEARCH_ALERT_MIN_HIT_RATIO_PCT) ?? 70,
  searchAlertP95LatencyMs: toPositiveNumber(process.env.SEARCH_ALERT_P95_LATENCY_MS) ?? 150,
  searchAlertSlowQueryPct: toPositiveNumber(process.env.SEARCH_ALERT_SLOW_QUERY_PCT) ?? 1,
  searchAlertRegressionPct: toPositiveNumber(process.env.SEARCH_ALERT_REGRESSION_PCT) ?? 20,
  searchEnableSynonyms: toBoolean(process.env.SEARCH_ENABLE_SYNONYMS, true),
  searchEnableFuzzy: toBoolean(process.env.SEARCH_ENABLE_FUZZY, true),
  searchEnablePersonalization: toBoolean(process.env.SEARCH_ENABLE_PERSONALIZATION, true),
  searchMaxEditDistance: toPositiveNumber(process.env.SEARCH_MAX_EDIT_DISTANCE) ?? 2,
  searchSuggestionLimit: toPositiveNumber(process.env.SEARCH_SUGGESTION_LIMIT) ?? 10,
  perfProfilingEnabled: toBoolean(process.env.PERF_PROFILING_ENABLED, false),
  mongooseDebugEnabled: toBoolean(process.env.MONGOOSE_DEBUG_ENABLED, false),
  mongooseAutoIndex: toBoolean(process.env.MONGOOSE_AUTO_INDEX, false),
  mongooseMinPoolSize: toPositiveNumber(process.env.MONGOOSE_MIN_POOL_SIZE) ?? 5,
  mongooseMaxPoolSize: toPositiveNumber(process.env.MONGOOSE_MAX_POOL_SIZE) ?? 30,
  mongooseMaxIdleTimeMs: toPositiveNumber(process.env.MONGOOSE_MAX_IDLE_TIME_MS) ?? 60_000,
  mongooseServerSelectionTimeoutMs:
    toPositiveNumber(process.env.MONGOOSE_SERVER_SELECTION_TIMEOUT_MS) ?? 10_000,
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ??
    process.env.FRONTEND_URL ??
    process.env.CORS_ORIGIN ??
    'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
