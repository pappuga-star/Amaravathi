import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
import { purchaseBatchSchema } from '@amaravathi/shared-types';
import { generateBatchCode } from '@amaravathi/shared-utils';
import { connectDatabase } from '../config/db.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';

type QueryTiming = {
  model: string;
  op: string;
  ms: number;
  conditions?: unknown;
};

const targetBatchId =
  process.argv[2] || process.env.PURCHASE_BATCH_UPDATE_AUDIT_ID || '';

const timings = new Map<string, number>();
const queries: QueryTiming[] = [];
let collectQueries = true;

function now() {
  return performance.now();
}

async function measure<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const start = now();
  try {
    return await fn();
  } finally {
    timings.set(label, now() - start);
  }
}

function normalizePurchaseDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function getPurchaseDateRange(purchaseDate: Date) {
  const start = normalizePurchaseDate(purchaseDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function normalizePayload(body: any) {
  const lineItems = body.lineItems.map((item: any) => {
    const quantityKg = Number(item.quantityKg);
    const pricePerKg = Number(item.pricePerKg);
    return {
      teaPowderTypeId: item.teaPowderTypeId,
      teaPowderTypeName: String(item.teaPowderTypeName).trim(),
      quantityKg,
      pricePerKg,
      totalAmount: Number((quantityKg * pricePerKg).toFixed(2)),
      availableStockInGrams: Math.round(quantityKg * 1000),
    };
  });

  const totalQuantityKg = Number(
    lineItems
      .reduce((sum: number, item: any) => sum + item.quantityKg, 0)
      .toFixed(3),
  );
  const totalBatchAmount = Number(
    lineItems
      .reduce((sum: number, item: any) => sum + item.totalAmount, 0)
      .toFixed(2),
  );

  const purchaseDate = normalizePurchaseDate(body.purchaseDate);
  const numberOfBags = Number(body.numberOfBags);

  return {
    purchaseDate,
    numberOfBags,
    billNumber: String(body.billNumber).trim(),
    sellerId: body.sellerId ? String(body.sellerId).trim() : undefined,
    sellerName: String(body.sellerName ?? '').trim(),
    batchCode: generateBatchCode(numberOfBags, purchaseDate),
    lineItems,
    totalQuantityKg,
    totalBatchAmount,
  };
}

function formatBatch(batch: any) {
  const lineItems = (batch.lineItems ?? batch.items ?? []).map((item: any) => ({
    _id: item._id ? String(item._id) : undefined,
    id: item._id ? String(item._id) : undefined,
    teaPowderTypeId: String(item.teaPowderTypeId ?? ''),
    teaPowderTypeName: item.teaPowderTypeName ?? item.teaPowderType ?? '',
    quantityKg: Number(item.quantityKg ?? 1),
    pricePerKg: Number(item.pricePerKg ?? item.ratePerKg ?? 0),
    totalAmount: Number(
      item.totalAmount ??
        Number(item.quantityKg ?? 1) *
          Number(item.pricePerKg ?? item.ratePerKg ?? 0),
    ),
    availableStockInGrams: Number(item.availableStockInGrams ?? 0),
    teaPowderType: item.teaPowderTypeName ?? item.teaPowderType ?? '',
    ratePerKg: Number(item.pricePerKg ?? item.ratePerKg ?? 0),
    ingredientCategory: item.ingredientCategory ?? 'Leaf',
    pricePerGram:
      Number(item.pricePerKg ?? item.ratePerKg ?? 0) > 0
        ? Number(item.pricePerKg ?? item.ratePerKg ?? 0) / 1000
        : 0,
    subSerialNumber: Number(item.subSerialNumber ?? 0) || undefined,
  }));

  return {
    id: String(batch._id),
    serialNumber: batch.serialNumber,
    numberOfBags: batch.numberOfBags,
    purchaseDate: batch.purchaseDate.toISOString(),
    billNumber: batch.billNumber,
    sellerId: batch.sellerId ? String(batch.sellerId) : '',
    sellerName: batch.sellerName ?? '',
    batchCode: batch.batchCode,
    lineItems,
    items: lineItems,
    totalQuantityKg: Number(batch.totalQuantityKg ?? 0),
    totalBatchAmount: Number(batch.totalBatchAmount ?? 0),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function payloadFromBatch(batch: any) {
  return {
    purchaseDate: batch.purchaseDate,
    numberOfBags: batch.numberOfBags,
    billNumber: batch.billNumber,
    sellerId: batch.sellerId ? String(batch.sellerId) : undefined,
    sellerName: batch.sellerName,
    batchCode: batch.batchCode,
    lineItems: (batch.lineItems ?? []).map((item: any) => ({
      teaPowderTypeId: String(item.teaPowderTypeId ?? ''),
      teaPowderTypeName: item.teaPowderTypeName,
      quantityKg: item.quantityKg,
      pricePerKg: item.pricePerKg,
      totalAmount: item.totalAmount,
    })),
    totalQuantityKg: batch.totalQuantityKg,
    totalBatchAmount: batch.totalBatchAmount,
  };
}

function installQueryTiming() {
  const originalExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = async function patchedExec(...args: any[]) {
    const start = now();
    try {
      return await originalExec.apply(this, args as any);
    } finally {
      if (collectQueries) {
        queries.push({
          model: this.model?.modelName ?? 'unknown',
          op: (this as any).op ?? 'unknown',
          ms: now() - start,
          conditions: this.getQuery(),
        });
      }
    }
  };
}

async function explainDuplicateQuery(payload: ReturnType<typeof normalizePayload>, currentBatchId: string) {
  const { start, end } = getPurchaseDateRange(payload.purchaseDate);
  const query: any = {
    purchaseDate: { $gte: start, $lt: end },
    sellerName: payload.sellerName,
    billNumber: payload.billNumber,
    _id: { $ne: currentBatchId },
  };
  return AddPurchaseBatch.findOne(query).explain('executionStats');
}

async function run() {
  installQueryTiming();
  await connectDatabase();

  const session = await mongoose.startSession();
  let selectedId = targetBatchId;
  if (!selectedId) {
    const latest = await AddPurchaseBatch.findOne()
      .sort({ updatedAt: -1 })
      .select('_id')
      .lean();
    selectedId = latest ? String(latest._id) : '';
  }
  if (!selectedId) {
    throw new Error('No purchase batch found to audit.');
  }

  let payload: ReturnType<typeof normalizePayload> | null = null;
  let explain: any = null;

  const existingForPayload = await AddPurchaseBatch.findById(selectedId).lean();
  if (!existingForPayload) {
    throw new Error(`Purchase batch not found: ${selectedId}`);
  }
  const requestBody = payloadFromBatch(existingForPayload);
  queries.length = 0;

  await session.withTransaction(async () => {
    const updatePurchaseBatchTotalStart = now();

    const parsedBody = await measure('validation', () =>
      purchaseBatchSchema.parse(requestBody),
    );
    payload = await measure('lineItemProcessing', () =>
      normalizePayload(parsedBody),
    );

    timings.set('findExistingBatch', 0);
    timings.set('duplicateChecks', 0);
    await measure('stockRecalculation', () => undefined);
    await measure('populateResponse', () => undefined);

    const updatedBatch = await measure('findOneAndUpdate', () =>
      AddPurchaseBatch.findOneAndUpdate(
        { _id: selectedId },
        { $set: payload! },
        {
          new: true,
          runValidators: true,
          context: 'query',
          session,
        },
      ).lean(),
    );
    if (!updatedBatch) {
      throw new Error(`Purchase batch not found: ${selectedId}`);
    }

    await measure('responseSerialization', () =>
      formatBatch(updatedBatch),
    );

    timings.set('updatePurchaseBatchTotal', now() - updatePurchaseBatchTotalStart);
    collectQueries = false;
    explain = await explainDuplicateQuery(payload!, selectedId);
    collectQueries = true;
    await session.abortTransaction();
  });

  const sortedQueries = [...queries].sort((a, b) => b.ms - a.ms);
  const repeatedQueries = new Map<string, number>();
  for (const query of queries) {
    const key = `${query.model}.${query.op}:${JSON.stringify(query.conditions)}`;
    repeatedQueries.set(key, (repeatedQueries.get(key) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        auditedBatchId: selectedId,
        timingsMs: Object.fromEntries(
          [...timings.entries()].map(([key, value]) => [
            key,
            Number(value.toFixed(3)),
          ]),
        ),
        querySummary: {
          totalQueries: queries.length,
          queriesOver100ms: queries.filter((query) => query.ms > 100).length,
          slowestQueries: sortedQueries.slice(0, 10).map((query) => ({
            ...query,
            ms: Number(query.ms.toFixed(3)),
          })),
          repeatedQueries: [...repeatedQueries.entries()]
            .filter(([, count]) => count > 1)
            .map(([query, count]) => ({ query, count })),
        },
        duplicateCheckExplain: {
          winningPlan:
            explain?.queryPlanner?.winningPlan ??
            explain?.queryPlanner?.winningPlan?.queryPlan,
          executionStats: {
            executionTimeMillis: explain?.executionStats?.executionTimeMillis,
            totalKeysExamined: explain?.executionStats?.totalKeysExamined,
            totalDocsExamined: explain?.executionStats?.totalDocsExamined,
            nReturned: explain?.executionStats?.nReturned,
          },
        },
      },
      null,
      2,
    ),
  );

  await session.endSession();
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
