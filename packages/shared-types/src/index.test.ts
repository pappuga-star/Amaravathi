import { describe, expect, it } from 'vitest';
import {
  leafCategorySchema,
  userSchema,
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

  describe('userSchema', () => {
    it('validates correct user data with all required fields', () => {
      const result = userSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        active: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = userSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        role: 'super_admin',
      });
      expect(result.success).toBe(false);
    });

    it('defaults role to viewer if omitted', () => {
      const result = userSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('viewer');
      }
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
        },
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

    it('allows empty or missing purchaseBatchLineItemId for non-batched ingredients', () => {
      const payload = {
        ...validPayload,
        lineItems: [
          {
            ...validPayload.lineItems[0],
            purchaseBatchLineItemId: '',
            purchaseBatchCode: '',
          },
        ],
      };
      const result = customerTeaFormulaSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid purchaseBatchLineItemId format', () => {
      const payload = {
        ...validPayload,
        lineItems: [
          {
            ...validPayload.lineItems[0],
            purchaseBatchLineItemId: 'not-an-object-id',
          },
        ],
      };
      const result = customerTeaFormulaSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(
          (err) => err.path.includes('purchaseBatchLineItemId')
        );
        expect(error?.message).toBe('Invalid purchase batch line item ID');
      }
    });
  });
});
