import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@amaravathi/shared-ui';
import { api } from '../lib/api';
import { SearchAlertsPanel } from './SearchAlertsPanel';
import { SearchBenchmarkPanel } from './SearchBenchmarkPanel';
import { SearchHealthDashboard } from './SearchHealthDashboard';
import { SearchMetricsPanel } from './SearchMetricsPanel';
import { SearchAnalyticsDashboard } from './SearchAnalyticsDashboard';
import { useSearchHealth } from './useSearchHealth';
import { useSearchMetrics } from './useSearchMetrics';

export function SearchAdminPage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ role: string }>('/auth/me'),
  });
  const health = useSearchHealth();
  const metrics = useSearchMetrics();

  if (me.data?.role && me.data.role !== 'admin') {
    return <p className="text-sm text-red-600">Access denied. Admin role required.</p>;
  }

  const clearCache = useMutation({
    mutationFn: () => api('/search-admin/clear-cache', { method: 'POST' }),
    onSuccess: () => {
      void health.refetch();
      void metrics.refetch();
    },
  });

  const runIndexAudit = useMutation({
    mutationFn: () => api('/search-admin/index-audit', { method: 'POST' }),
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Search Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => clearCache.mutate()} disabled={clearCache.isPending}>Clear Cache</Button>
          <Button variant="secondary" onClick={() => runIndexAudit.mutate()} disabled={runIndexAudit.isPending}>Run Index Audit</Button>
        </div>
      </div>

      {health.data ? <SearchHealthDashboard health={health.data} /> : <p>Loading health...</p>}
      {metrics.data ? <SearchMetricsPanel metrics={metrics.data} /> : <p>Loading metrics...</p>}
      <SearchAlertsPanel />
      <SearchBenchmarkPanel />
      <SearchAnalyticsDashboard />

      {runIndexAudit.data ? (
        <section className="rounded border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold">Index Audit Result</h3>
          <pre className="max-h-80 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(runIndexAudit.data, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
