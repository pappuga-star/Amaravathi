import type { SearchMetrics } from './useSearchMetrics';

export function SearchMetricsPanel({ metrics }: { metrics: SearchMetrics }) {
  return (
    <section className="rounded border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">Search Metrics</h3>
      <div className="grid gap-2 text-xs md:grid-cols-3">
        <div>Total Searches: <b>{metrics.totalSearches}</b></div>
        <div>Cache Hits: <b>{metrics.cacheHits}</b></div>
        <div>Cache Misses: <b>{metrics.cacheMisses}</b></div>
        <div>Errors: <b>{metrics.searchErrors}</b></div>
        <div>Hit Ratio: <b>{metrics.cacheHitRatioPct}%</b></div>
        <div>Slow Queries: <b>{metrics.slowQueries}</b></div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold">Top Modules</div>
          <ul className="mt-1 text-xs">
            {metrics.topModules.map((m) => (
              <li key={m.module}>{m.module}: {m.count}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold">Top Sanitized Terms</div>
          <ul className="mt-1 text-xs">
            {metrics.topSanitizedTerms.map((t) => (
              <li key={t.term}>{t.term}: {t.count}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
