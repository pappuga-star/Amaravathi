import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type Row = { term: string; count: number };

type AnalyticsPayload = {
  popularTerms: Row[];
  noResultTerms: Row[];
  correctedTerms: Row[];
};

export function SearchAnalyticsDashboard() {
  const { data } = useQuery({
    queryKey: ['global-search-analytics'],
    queryFn: () => api<AnalyticsPayload>('/global-search/analytics'),
    staleTime: 20_000,
  });

  if (!data) return <p className="text-xs text-slate-500">Loading search quality analytics...</p>;

  const render = (title: string, rows: Row[]) => (
    <div className="rounded border bg-white p-3">
      <h4 className="text-xs font-semibold mb-2">{title}</h4>
      <ul className="text-xs space-y-1">
        {rows.map((r) => (
          <li key={r.term}>{r.term}: {r.count}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {render('Popular Terms', data.popularTerms)}
      {render('No Result Terms', data.noResultTerms)}
      {render('Corrected Terms', data.correctedTerms)}
    </div>
  );
}
