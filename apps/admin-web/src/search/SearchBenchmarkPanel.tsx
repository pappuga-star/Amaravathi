import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Input } from '@amaravathi/shared-ui';
import { api } from '../lib/api';

type BenchmarkRow = { engine: string; coldMs: number; warmMs: number; throughputPerSec: number };

export function SearchBenchmarkPanel() {
  const [query, setQuery] = useState('tea');
  const [iterations, setIterations] = useState(20);

  const benchmark = useMutation({
    mutationFn: () =>
      api<BenchmarkRow[]>('/search-admin/run-benchmark', {
        method: 'POST',
        body: JSON.stringify({ query, iterations }),
      }),
  });

  return (
    <section className="rounded border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">Benchmark</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="query" className="h-9 w-40" />
        <Input type="number" value={iterations} onChange={(e) => setIterations(Number(e.target.value || 20))} className="h-9 w-28" />
        <Button onClick={() => benchmark.mutate()} disabled={benchmark.isPending}>Run</Button>
      </div>
      {benchmark.data ? (
        <table className="w-full text-xs">
          <thead><tr><th className="text-left">Engine</th><th className="text-left">Cold</th><th className="text-left">Warm</th><th className="text-left">Throughput</th></tr></thead>
          <tbody>
            {benchmark.data.map((r) => (
              <tr key={r.engine}><td>{r.engine}</td><td>{r.coldMs} ms</td><td>{r.warmMs} ms</td><td>{r.throughputPerSec}/s</td></tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
