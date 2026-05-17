import { describe, expect, it } from 'vitest';
import {
  leafCategorySchema,
  cuttingTypeSchema,
  customerTeaFormulaSchema,
} from './index';

describe('Master Data Zod Schemas', () => {
  describe('leafCategorySchema', () => {
    it('validates correct leaf category data', () => {
      const result = leafCategorySchema.safeParse({
        name: 'Assam Gold',
        description: 'Premium Assam leaf tea',
        active: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects too short name', () => {
      const result = leafCategorySchema.safeParse({
        name: 'A',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('cuttingTypeSchema', () => {
    it('validates correct cutting type data', () => {
      const result = cuttingTypeSchema.safeParse({
        name: 'BOP',
        basePrice: 25.5,
        leafCategoryId: '507f1f77bcf86cd799439012',
        description: 'Broken Orange Pekoe',
        active: true,
      });
      expect(result.success).toBe(true);
    });

    it('allows negative basePrice if adjustment', () => {
      const result = cuttingTypeSchema.safeParse({
        name: 'Dust Adjustment',
        basePrice: -10,
        leafCategoryId: '507f1f77bcf86cd799439012',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = cuttingTypeSchema.safeParse({
        name: '',
        basePrice: 0,
        leafCategoryId: '507f1f77bcf86cd799439012',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('customerTeaFormulaSchema', () => {
    const validPayload = {
      customerId: '507f1f77bcf86cd799439011',
      formulaName: 'Kalyan Custom Blend',
      teaPowderType: 'Custom Blend',
      totalWeight: 100,
      totalFormulaCost: 50,
      costPerKg: 500,
      costPer100Grams: 50,
      lineItems: [
        {
          purchaseBatchCode: 'PB-001',
          purchaseBatchLineItemId: '507f1f77bcf86cd799439014',
          ingredientCategory: 'Leaf' as const,
          ingredientName: 'Assam Gold',
          quantityInGrams: 100,
          pricePerGram: 0.5,
          rowCost: 50,
        }
      ],
      isDefault: true,
      notes: 'Custom tea recipe',
      status: 'Active',
    };

    it('validates correct customer tea formula data', () => {
      const result = customerTeaFormulaSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects empty customerId or formulaName', () => {
      const result = customerTeaFormulaSchema.safeParse({
        ...validPayload,
        customerId: '',
        formulaName: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative price values in addons', () => {
      const result = customerTeaFormulaSchema.safeParse({
        ...validPayload,
        addons: [{ name: 'Bad Addon', price: -5 }],
      });
      expect(result.success).toBe(false);
    });

    it('allows invalid status types to be caught', () => {
      const result = customerTeaFormulaSchema.safeParse({
        ...validPayload,
        status: 'InvalidStatus', // Only Active or Inactive allowed
      });
      expect(result.success).toBe(false);
    });
  });
});
