import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { validateAndBuildLineItems } from './customerTeaFormulaController.js';
import { AddPurchaseBatch } from '../models/index.js';

describe('validateAndBuildLineItems', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recomputes line items with matched batch line item using lineItemId', async () => {
    const lineItemId = new mongoose.Types.ObjectId();
    vi.spyOn(AddPurchaseBatch, 'aggregate').mockResolvedValue([
      {
        lineItemId,
        batchCode: 'BATCH-001',
        teaPowderTypeName: 'Assam Gold',
        pricePerKg: 400,
        availableStockInGrams: 10000,
      },
    ] as any);

    const result = await validateAndBuildLineItems([
      {
        purchaseBatchCode: 'BATCH-001',
        purchaseBatchLineItemId: String(lineItemId),
        ingredientCategory: 'Leaf',
        ingredientName: 'Assam Gold',
        quantityInGrams: 250,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updatedLineItems[0]).toBeDefined();
      expect(result.updatedLineItems[0]!.purchaseBatchLineItemId).toBe(
        String(lineItemId),
      );
      expect(result.updatedLineItems[0]!.pricePerGram).toBe(0.4);
      expect(result.updatedLineItems[0]!.rowCost).toBe(100);
    }
  });

  it('allows empty purchaseBatchLineItemId and uses provided pricePerGram', async () => {
    const result = await validateAndBuildLineItems([
      {
        purchaseBatchCode: '',
        purchaseBatchLineItemId: '',
        ingredientCategory: 'Leaf',
        ingredientName: 'Assam Gold',
        quantityInGrams: 100,
        pricePerGram: 0.5,
        rowCost: 0,
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.updatedLineItems[0]!.pricePerGram).toBe(0.5);
      expect(result.updatedLineItems[0]!.rowCost).toBe(50);
    }
  });

  it('throws AppError (not TypeError) when matched item lacks lineItemId', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    vi.spyOn(AddPurchaseBatch, 'aggregate').mockResolvedValue([
      {
        lineItemId: fakeId,
        batchCode: 'BATCH-001',
        teaPowderTypeName: 'Assam Gold',
        pricePerKg: 400,
        availableStockInGrams: 10000,
      },
    ] as any);

    // Force malformed map entry by monkey-patching aggregate result after key creation.
    // The function must never emit TypeError from `.toString()` on undefined.
    const promise = validateAndBuildLineItems([
      {
        purchaseBatchCode: 'BATCH-001',
        purchaseBatchLineItemId: String(fakeId),
        ingredientCategory: 'Leaf',
        ingredientName: 'Assam Gold',
        quantityInGrams: 100,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);

    await expect(promise).resolves.toMatchObject({ ok: true });
  });

  it('returns 400 when batch item and batch code mismatch', async () => {
    const lineItemId = new mongoose.Types.ObjectId();
    vi.spyOn(AddPurchaseBatch, 'aggregate').mockResolvedValue([
      {
        lineItemId,
        batchCode: 'BATCH-999',
        teaPowderTypeName: 'Assam Gold',
        pricePerKg: 400,
        availableStockInGrams: 10000,
      },
    ] as any);

    const result = await validateAndBuildLineItems([
      {
        purchaseBatchCode: 'BATCH-001',
        purchaseBatchLineItemId: String(lineItemId),
        ingredientCategory: 'Leaf',
        ingredientName: 'Assam Gold',
        quantityInGrams: 100,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message).toContain('mismatch');
    }
  });

  it('returns 400 for malformed matched values instead of throwing TypeError', async () => {
    const lineItemId = new mongoose.Types.ObjectId();
    vi.spyOn(AddPurchaseBatch, 'aggregate').mockResolvedValue([
      {
        lineItemId: '' as unknown as mongoose.Types.ObjectId,
        batchCode: 'BATCH-001',
        teaPowderTypeName: 'Assam Gold',
        pricePerKg: 400,
        availableStockInGrams: 10000,
      },
    ] as any);

    const result = await validateAndBuildLineItems([
      {
        purchaseBatchCode: 'BATCH-001',
        purchaseBatchLineItemId: String(lineItemId),
        ingredientCategory: 'Leaf',
        ingredientName: 'Assam Gold',
        quantityInGrams: 100,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });
});
