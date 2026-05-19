import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type Alert = { code: string; severity: 'info' | 'warning' | 'critical'; message: string; at: string };

export function SearchAlertsPanel() {
  const { data = [] } = useQuery({
    queryKey: ['search-admin', 'alerts'],
    queryFn: () => api<Alert[]>('/search-admin/alerts'),
    refetchInterval: 15_000,
  });

  return (
    <section className="rounded border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">Alerts</h3>
      {data.length === 0 ? <p className="text-xs text-slate-500">No active alerts.</p> : null}
      <ul className="space-y-2 text-xs">
        {data.map((a) => (
          <li key={`${a.code}-${a.at}`} className="rounded border p-2">
            <b>[{a.severity.toUpperCase()}]</b> {a.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
