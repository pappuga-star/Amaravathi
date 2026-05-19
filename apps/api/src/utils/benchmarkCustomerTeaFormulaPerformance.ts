import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

type Stats = {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
};

type BenchmarkOutcome = {
  endpoint: string;
  method: 'GET' | 'POST';
  runs: number;
  statusCodes: Record<string, number>;
  latencyMs: Stats;
  payloadBytes: Stats;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)] ?? 0;
}

function summarize(values: number[]): Stats {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    avg: Number((sum / values.length).toFixed(2)),
    p50: Number(percentile(sorted, 50).toFixed(2)),
    p95: Number(percentile(sorted, 95).toFixed(2)),
  };
}

function parseEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

async function benchmarkEndpoint(options: {
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST';
  runs: number;
  token?: string;
  body?: unknown;
}): Promise<BenchmarkOutcome> {
  const latencies: number[] = [];
  const payloadSizes: number[] = [];
  const statusCodes: Record<string, number> = {};

  for (let i = 0; i < options.runs; i += 1) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      (headers as Record<string, string>).Authorization = `Bearer ${options.token}`;
    }

    const requestInit: RequestInit = {
      method: options.method,
      headers,
    };
    if (options.method === 'POST') {
      requestInit.body = JSON.stringify(options.body ?? {});
    }

    const started = performance.now();
    const response = await fetch(
      `${options.baseUrl}${options.endpoint}`,
      requestInit,
    );
    const elapsed = performance.now() - started;
    const text = await response.text();

    latencies.push(elapsed);
    payloadSizes.push(Buffer.byteLength(text, 'utf8'));
    statusCodes[String(response.status)] = (statusCodes[String(response.status)] ?? 0) + 1;
  }

  return {
    endpoint: options.endpoint,
    method: options.method,
    runs: options.runs,
    statusCodes,
    latencyMs: summarize(latencies),
    payloadBytes: summarize(payloadSizes),
  };
}

async function loadCreatePayload(): Promise<unknown | null> {
  const file = process.env.TEA_FORMULA_CREATE_PAYLOAD_FILE;
  if (!file) return null;
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw);
}

function formatResultTable(results: BenchmarkOutcome[]): string {
  const header =
    '| Endpoint | Method | Runs | Status Codes | p50 (ms) | p95 (ms) | Avg (ms) | Avg Payload (bytes) |';
  const divider =
    '| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |';
  const rows = results.map((r) => {
    const statuses = Object.entries(r.statusCodes)
      .map(([code, count]) => `${code}x${count}`)
      .join(', ');
    return `| ${r.endpoint} | ${r.method} | ${r.runs} | ${statuses} | ${r.latencyMs.p50} | ${r.latencyMs.p95} | ${r.latencyMs.avg} | ${r.payloadBytes.avg} |`;
  });
  return [header, divider, ...rows].join('\n');
}

async function main() {
  const baseUrl = (process.env.API_BASE_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
  const token = process.env.BENCHMARK_AUTH_TOKEN;
  const runs = parseEnvNumber('BENCHMARK_RUNS', 20);
  const listQuery =
    process.env.TEA_FORMULA_LIST_QUERY ??
    '/customer-tea-formulas?q=&status=all&limit=100';
  const detailId = process.env.TEA_FORMULA_DETAIL_ID;
  const createPayload = await loadCreatePayload();

  const results: BenchmarkOutcome[] = [];

  const listOptions: {
    baseUrl: string;
    endpoint: string;
    method: 'GET';
    runs: number;
    token?: string;
  } = {
    baseUrl,
    endpoint: listQuery.startsWith('/') ? listQuery : `/${listQuery}`,
    method: 'GET',
    runs,
  };
  if (token) listOptions.token = token;
  const listResult = await benchmarkEndpoint(listOptions);
  results.push(listResult);

  let resolvedDetailId = detailId;
  if (!resolvedDetailId) {
    const fetchInit: RequestInit = {};
    if (token) {
      fetchInit.headers = { Authorization: `Bearer ${token}` };
    }
    const response = await fetch(
      `${baseUrl}${listQuery.startsWith('/') ? listQuery : `/${listQuery}`}`,
      fetchInit,
    );
    const data = await response.json().catch(() => null);
    resolvedDetailId = data?.items?.[0]?.id ?? data?.items?.[0]?._id;
  }

  if (resolvedDetailId) {
    const detailOptions: {
      baseUrl: string;
      endpoint: string;
      method: 'GET';
      runs: number;
      token?: string;
    } = {
      baseUrl,
      endpoint: `/customer-tea-formulas/${resolvedDetailId}?includeHistory=false`,
      method: 'GET',
      runs,
    };
    if (token) detailOptions.token = token;
    const detailResult = await benchmarkEndpoint(detailOptions);
    results.push(detailResult);
  } else {
    console.warn('Skipped detail benchmark: no TEA_FORMULA_DETAIL_ID and no list item found.');
  }

  if (createPayload) {
    const createOptions: {
      baseUrl: string;
      endpoint: string;
      method: 'POST';
      runs: number;
      body: unknown;
      token?: string;
    } = {
      baseUrl,
      endpoint: '/customer-tea-formulas',
      method: 'POST',
      runs,
      body: createPayload,
    };
    if (token) createOptions.token = token;
    const createResult = await benchmarkEndpoint(createOptions);
    results.push(createResult);
  } else {
    console.warn(
      'Skipped create benchmark: set TEA_FORMULA_CREATE_PAYLOAD_FILE to a valid JSON payload file.',
    );
  }

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    runs,
    results,
  };

  console.log('\nCustomer Tea Formula Benchmark');
  console.log(formatResultTable(results));
  console.log('\nRaw JSON');
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exitCode = 1;
});
