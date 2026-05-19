import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
import { env } from './env.js';
import { getRequestPerformanceStore } from '../utils/requestPerformanceContext.js';

let mongooseInstrumentationEnabled = false;

function summarizeQuery(
  collectionName: string,
  op: string,
  query: Record<string, unknown> | undefined,
) {
  const querySnippet = query ? JSON.stringify(query).slice(0, 220) : '{}';
  return `${collectionName}.${op} ${querySnippet}`;
}

function setupMongooseDebugAndTiming() {
  if (mongooseInstrumentationEnabled) return;
  mongooseInstrumentationEnabled = true;

  const queryExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = async function patchedExec(...args: any[]) {
    const startedAt = performance.now();
    try {
      return await queryExec.apply(this, args as any);
    } finally {
      const elapsedMs = performance.now() - startedAt;
      const collectionName = this.model?.collection?.name ?? 'unknown_collection';
      const op = ((this as any).op as string | undefined) ?? 'unknown_op';
      const summary = summarizeQuery(
        collectionName,
        op,
        this.getQuery?.() as Record<string, unknown> | undefined,
      );
      const store = getRequestPerformanceStore();
      if (store) {
        store.dbQueryCount += 1;
        store.dbTimeMs += elapsedMs;
        if (elapsedMs > store.dbLongestMs) {
          store.dbLongestMs = elapsedMs;
          store.dbLongestSummary = summary;
        }
      }
      if (env.perfProfilingEnabled) {
        console.log(`[mongoose:query] ${elapsedMs.toFixed(2)}ms ${summary}`);
      }
    }
  };

  if (env.mongooseDebugEnabled || env.perfProfilingEnabled) {
    mongoose.set('debug', (collectionName, methodName, ...methodArgs) => {
      const argsPreview = methodArgs
        .map((arg) => {
          try {
            return JSON.stringify(arg);
          } catch {
            return '[unserializable]';
          }
        })
        .join(' ');
      console.log(`[mongoose:debug] ${collectionName}.${methodName} ${argsPreview}`);
    });
  }
}

function setupPoolWaitInstrumentation() {
  const client = mongoose.connection.getClient();
  if (!client || (client as any).__amaravathiPoolHooksAttached) return;

  (client as any).__amaravathiPoolHooksAttached = true;
  const pendingCheckoutStartedAt = new Map<number, number>();
  let checkoutSeq = 0;

  client.on('connectionCheckOutStarted', () => {
    checkoutSeq += 1;
    pendingCheckoutStartedAt.set(checkoutSeq, performance.now());
  });

  client.on('connectionCheckedOut', () => {
    const now = performance.now();
    const first = pendingCheckoutStartedAt.keys().next();
    if (!first.done) {
      const started = pendingCheckoutStartedAt.get(first.value);
      if (started != null) {
        const waitMs = now - started;
        const store = getRequestPerformanceStore();
        if (store) {
          store.dbPoolCheckouts += 1;
          store.dbPoolWaitMs += waitMs;
        }
      }
      pendingCheckoutStartedAt.delete(first.value);
    }
  });

  client.on('connectionCheckOutFailed', () => {
    const first = pendingCheckoutStartedAt.keys().next();
    if (!first.done) {
      pendingCheckoutStartedAt.delete(first.value);
    }
    const store = getRequestPerformanceStore();
    if (store) {
      store.dbPoolCheckoutFailures += 1;
    }
  });
}

export async function connectDatabase(): Promise<void> {
  const uri = env.mongodbUri;

  if (!uri) {
    console.error('❌  MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  // Extract readable cluster/db info from the URI for logging
  const isAtlas = uri.includes('mongodb+srv');
  const dbName = uri.split('/').pop()?.split('?')[0] ?? 'unknown';
  const clusterHint = isAtlas
    ? (uri.match(/@([^/]+)/)?.[1] ?? 'Atlas')
    : '127.0.0.1 (local)';

  try {
    mongoose.set('strictQuery', true);
    mongoose.set('autoIndex', env.mongooseAutoIndex);
    setupMongooseDebugAndTiming();

    mongoose.connection.on('connected', () => {
      console.log('✅  Connected to MongoDB');
      console.log(`    Database : ${dbName}`);
      console.log(`    Cluster  : ${clusterHint}`);
      console.log(`    Mode     : ${isAtlas ? 'Atlas (cloud)' : 'Local'}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('⚠️  MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚡  MongoDB disconnected');
    });

    await mongoose.connect(uri, {
      monitorCommands: true,
      minPoolSize: env.mongooseMinPoolSize,
      maxPoolSize: env.mongooseMaxPoolSize,
      maxIdleTimeMS: env.mongooseMaxIdleTimeMs,
      serverSelectionTimeoutMS: env.mongooseServerSelectionTimeoutMs,
    });
    setupPoolWaitInstrumentation();
    // Warm one socket checkout so the first authenticated request doesn't pay cold-pool latency.
    await mongoose.connection.db?.admin().ping();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌  Failed to connect to MongoDB:', message);
    process.exit(1);
  }
}
