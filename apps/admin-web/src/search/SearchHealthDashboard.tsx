import type { SearchHealth } from './useSearchHealth';

export function SearchHealthDashboard({ health }: { health: SearchHealth }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <div className="rounded border bg-white p-3 text-sm">Cache Provider: <b>{health.cacheProvider}</b></div>
      <div className="rounded border bg-white p-3 text-sm">Search Engine: <b>{health.activeSearchEngine}</b></div>
      <div className="rounded border bg-white p-3 text-sm">Redis: <b>{health.redisConnected ? 'Connected' : 'Fallback'}</b></div>
      <div className="rounded border bg-white p-3 text-sm">Cache Size: <b>{health.cacheSize}</b></div>
      <div className="rounded border bg-white p-3 text-sm">Hit Ratio: <b>{health.cacheHitRatioPct}%</b></div>
      <div className="rounded border bg-white p-3 text-sm">p95 Latency: <b>{health.p95LatencyMs} ms</b></div>
      <div className="rounded border bg-white p-3 text-sm">Avg Latency: <b>{health.averageLatencyMs} ms</b></div>
      <div className="rounded border bg-white p-3 text-sm">Slow Queries: <b>{health.slowQueryCount}</b></div>
      <div className="rounded border bg-white p-3 text-sm">Invalidations: <b>{health.invalidationCount}</b></div>
    </section>
  );
}
