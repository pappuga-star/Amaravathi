import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';

type EndpointProbe = {
  label: string;
  collection: string;
  filter: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
};

const probes: EndpointProbe[] = [
  {
    label: 'GET /users?limit=1',
    collection: 'users',
    filter: {},
    sort: { createdAt: -1 },
  },
  {
    label: 'GET /customers?limit=1',
    collection: 'customers',
    filter: {},
    sort: { createdAt: -1 },
  },
  {
    label: 'GET /tea-powder-types?limit=1',
    collection: 'teapowdertypes',
    filter: {},
    sort: { createdAt: -1 },
  },
  {
    label: 'GET /auth/me',
    collection: 'users',
    filter: {},
    projection: { _id: 1, name: 1, email: 1, role: 1, active: 1 },
  },
];

function summarizeWinningPlan(plan: any): string {
  const stages: string[] = [];

  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.stage && typeof node.stage === 'string') {
      stages.push(node.stage);
    }
    if (node.inputStage) visit(node.inputStage);
    if (Array.isArray(node.inputStages)) {
      for (const stage of node.inputStages) visit(stage);
    }
    if (node.executionStages) visit(node.executionStages);
    if (node.shards && typeof node.shards === 'object') {
      for (const shard of Object.values(node.shards as Record<string, any>)) {
        visit((shard as any).winningPlan);
      }
    }
  };

  visit(plan);
  return [...new Set(stages)].join(' -> ');
}

async function ensureProfilerEnabled() {
  const level = Number(process.env.MONGO_PROFILE_LEVEL ?? '1');
  const slowMs = Number(process.env.MONGO_SLOWMS ?? '50');
  try {
    await mongoose.connection.db?.command({ profile: level, slowms: slowMs });
    console.log(`Profiler configured: level=${level}, slowms=${slowMs}ms`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Profiler unavailable on this cluster: ${message}`);
    return false;
  }
}

async function printRecentSlowQueries() {
  const limit = Number(process.env.MONGO_PROFILE_LIMIT ?? '15');
  const rows = await mongoose.connection
    .collection('system.profile')
    .find({}, { projection: { op: 1, ns: 1, millis: 1, command: 1, ts: 1, planSummary: 1 } })
    .sort({ ts: -1 })
    .limit(limit)
    .toArray();

  console.log(`\nRecent profiler rows (${rows.length}):`);
  for (const row of rows) {
    const command = row.command && typeof row.command === 'object' ? Object.keys(row.command).slice(0, 3).join(',') : '';
    console.log(
      `- ${row.ts?.toISOString?.() ?? row.ts} | ${row.ns} | ${row.op} | ${row.millis}ms | plan=${row.planSummary ?? 'n/a'} | cmd=${command}`,
    );
  }
}

async function runExplains() {
  console.log('\nQuery plan audit:');
  for (const probe of probes) {
    const col = mongoose.connection.collection(probe.collection);
    const findOptions: Record<string, unknown> = { limit: 1 };
    if (probe.projection) findOptions.projection = probe.projection;
    if (probe.sort) findOptions.sort = probe.sort;
    const cursor = col.find(probe.filter, findOptions as any);
    const explain = await cursor.explain('executionStats');
    const winningPlan = (explain as any).queryPlanner?.winningPlan;
    const stages = summarizeWinningPlan(winningPlan);
    const docsExamined = (explain as any).executionStats?.totalDocsExamined ?? -1;
    const keysExamined = (explain as any).executionStats?.totalKeysExamined ?? -1;
    const executionTimeMillis = (explain as any).executionStats?.executionTimeMillis ?? -1;
    const usesCollscan = stages.includes('COLLSCAN');
    console.log(
      `- ${probe.label}: time=${executionTimeMillis}ms docs=${docsExamined} keys=${keysExamined} stages=${stages || 'n/a'} ${usesCollscan ? '[COLLSCAN]' : '[OK]'}`,
    );
  }
}

async function main() {
  await connectDatabase();
  const profilerEnabled = await ensureProfilerEnabled();
  await runExplains();
  if (profilerEnabled) {
    await printRecentSlowQueries();
  }
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('Forensic audit failed:', err instanceof Error ? err.message : String(err));
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
