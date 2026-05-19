import mongoose from 'mongoose';
import { normalizeName } from '@amaravathi/shared-utils';
import { connectDatabase } from '../config/db.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';
import { TeaPowderType } from '../models/TeaPowderType.js';

type AuditRow = {
  batchId: string;
  serialNumber: number;
  batchCode: string;
  purchaseDate: string;
  sellerName: string;
  billNumber: string;
  lineIndex: number;
  teaPowderTypeName: string;
  currentTeaPowderTypeId: string;
  matchedTypeId?: string;
  matchedTypeName?: string;
};

function summarizeByName(rows: AuditRow[]) {
  const summary = new Map<
    string,
    {
      teaPowderTypeName: string;
      count: number;
      matchedTypeId: string;
      matchedTypeName: string;
    }
  >();

  for (const row of rows) {
    const key = row.teaPowderTypeName || '(blank)';
    const existing = summary.get(key) ?? {
      teaPowderTypeName: key,
      count: 0,
      matchedTypeId: row.matchedTypeId ?? '',
      matchedTypeName: row.matchedTypeName ?? '',
    };
    existing.count += 1;
    summary.set(key, existing);
  }

  return [...summary.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.teaPowderTypeName.localeCompare(b.teaPowderTypeName),
  );
}

async function run() {
  await connectDatabase();

  const [batches, teaPowderTypes] = await Promise.all([
    AddPurchaseBatch.find()
      .select('serialNumber batchCode purchaseDate sellerName billNumber lineItems')
      .lean(),
    TeaPowderType.find().select('_id name nameKey').lean(),
  ]);

  const typeById = new Set(teaPowderTypes.map((type) => String(type._id)));
  const typeByNameKey = new Map(
    teaPowderTypes.map((type: any) => [
      type.nameKey || normalizeName(type.name || ''),
      type,
    ]),
  );

  const missing: AuditRow[] = [];
  const invalid: AuditRow[] = [];

  for (const batch of batches as any[]) {
    for (const [lineIndex, item] of (batch.lineItems ?? []).entries()) {
      const currentTeaPowderTypeId = item.teaPowderTypeId
        ? String(item.teaPowderTypeId)
        : '';
      const teaPowderTypeName = String(item.teaPowderTypeName ?? '').trim();
      const hasValidObjectId =
        currentTeaPowderTypeId &&
        mongoose.Types.ObjectId.isValid(currentTeaPowderTypeId);
      const baseRow: AuditRow = {
        batchId: String(batch._id),
        serialNumber: Number(batch.serialNumber ?? 0),
        batchCode: String(batch.batchCode ?? ''),
        purchaseDate: batch.purchaseDate?.toISOString?.().slice(0, 10) ?? '',
        sellerName: String(batch.sellerName ?? ''),
        billNumber: String(batch.billNumber ?? ''),
        lineIndex,
        teaPowderTypeName,
        currentTeaPowderTypeId,
      };

      if (!hasValidObjectId) {
        const matchedType = typeByNameKey.get(normalizeName(teaPowderTypeName));
        missing.push({
          ...baseRow,
          matchedTypeId: matchedType ? String(matchedType._id) : '',
          matchedTypeName: matchedType?.name ?? '',
        });
        continue;
      }

      if (!typeById.has(currentTeaPowderTypeId)) {
        invalid.push(baseRow);
      }
    }
  }

  const repairable = missing.filter((row) => row.matchedTypeId);
  const unrepairable = missing.filter((row) => !row.matchedTypeId);

  console.log(
    JSON.stringify(
      {
        totals: {
          batchesScanned: batches.length,
          teaPowderTypesScanned: teaPowderTypes.length,
          missingOrBlankLineItemIds: missing.length,
          missingIdsRepairableByName: repairable.length,
          missingIdsWithoutMasterMatch: unrepairable.length,
          invalidIdsPointingToNoMaster: invalid.length,
        },
        repairableNameSummary: summarizeByName(repairable),
        unrepairableNameSummary: summarizeByName(unrepairable),
        invalidIdRows: invalid,
        missingRows: missing,
      },
      null,
      2,
    ),
  );

  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
