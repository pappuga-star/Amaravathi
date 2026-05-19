import { z } from 'zod';

export const roles = [
  'admin',
  'pricing_manager',
  'viewer',
  'operator',
] as const;
export const marginTypes = ['amount', 'percentage'] as const;
export type Role = (typeof roles)[number];
export type MarginType = (typeof marginTypes)[number];

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format');
export const mobileSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits');

export const userSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).optional(),
  role: z.enum(roles).default('viewer'),
  active: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export const teaPowderTypeSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export const purchaseBatchLineItemSchema = z.object({
  teaPowderTypeId: objectIdSchema,
  teaPowderTypeName: z.string().trim().min(1),
  quantityKg: z.coerce.number().positive(),
  pricePerKg: z.coerce.number().positive(),
  totalAmount: z.coerce.number().nonnegative().optional(),
});

export const purchaseBatchSchema = z
  .object({
    serialNumber: z.number().int().positive().optional(),
    numberOfBags: z.coerce.number().int().positive(),
    purchaseDate: z.coerce.date(),
    billNumber: z.string().trim().min(1),
    sellerId: z.string().trim().optional(),
    sellerName: z.string().trim().optional(),
    batchCode: z.string().trim().optional(),
    lineItems: z.array(purchaseBatchLineItemSchema).min(1),
    totalQuantityKg: z.coerce.number().nonnegative().optional(),
    totalBatchAmount: z.coerce.number().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    const keys = value.lineItems.map((item) =>
      item.teaPowderTypeId.trim().toLowerCase(),
    );
    const duplicates = keys.filter((key, idx) => keys.indexOf(key) !== idx);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lineItems'],
        message: 'Duplicate tea powder types are not allowed in a batch.',
      });
    }
  });

export const purchaseBatchSearchSchema = z.object({
  q: z.string().trim().min(1),
});

export type UserInput = z.infer<typeof userSchema>;
export type TeaPowderTypeInput = z.infer<typeof teaPowderTypeSchema>;

export type PurchaseBatchInput = z.infer<typeof purchaseBatchSchema>;
export type PurchaseBatchLineItemInput = z.infer<
  typeof purchaseBatchLineItemSchema
>;
export type PurchaseBatchItemInput = PurchaseBatchLineItemInput;

export const sellerSchema = z.object({
  name: z.string().trim().min(2),
  contactPerson: z.string().trim().optional(),
  phone: mobileSchema.optional(),
  email: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type SellerInput = z.infer<typeof sellerSchema>;

export const leafCategorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type LeafCategoryInput = z.infer<typeof leafCategorySchema>;

export type LeafCategory = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const customerSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().optional(),
  mobileNumber: mobileSchema.optional(),
  active: z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export type Customer = {
  id: string;
  name: string;
  address?: string;
  mobileNumber?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
};

export type PurchaseBatchItem = {
  _id?: string;
  id?: string;
  teaPowderTypeId: string;
  teaPowderTypeName: string;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  /** @deprecated Use teaPowderTypeName */
  teaPowderType?: string;
  /** @deprecated Use pricePerKg */
  ratePerKg?: number;
  /** @deprecated */
  ingredientCategory?: 'Leaf' | 'Add-On';
  availableStockInGrams?: number;
  pricePerGram?: number;
  subSerialNumber?: number;
};

export type PurchaseBatch = {
  id: string;
  serialNumber: number;
  numberOfBags: number;
  purchaseDate: string;
  billNumber: string;
  sellerId: string;
  sellerName: string;
  batchCode: string;
  lineItems: PurchaseBatchItem[];
  /** @deprecated Use lineItems */
  items: PurchaseBatchItem[];
  totalQuantityKg: number;
  totalBatchAmount: number;
  createdAt: string;
  updatedAt: string;
};

export const customerTeaFormulaSchema = z.object({
  customerId: objectIdSchema,
  formulaCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  totalWeight: z.coerce.number().min(0).optional(),
  totalFormulaCost: z.coerce.number().min(0).optional(),
  costPerKg: z.coerce.number().min(0).optional(),
  costPer100Grams: z.coerce.number().min(0).optional(),
  isDefault: z.boolean().default(false),
  status: z.enum(['Active', 'Inactive']).default('Active'),

  lineItems: z
    .array(
      z.object({
        purchaseBatchCode: z.string().trim().min(1),
        purchaseBatchLineItemId: z
          .string({
            required_error: 'Purchase Batch Line Item ID is required.',
          })
          .trim()
          .regex(
            /^[0-9a-fA-F]{24}$/,
            'Invalid purchase batch line item ID',
          ),
        ingredientCategory: z.enum(['Leaf', 'Add-On']),
        ingredientName: z.string().trim().min(1),
        quantityInGrams: z.coerce.number().positive(),
        pricePerGram: z.coerce.number().min(0).optional(),
        rowCost: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1),

  // Legacy fields for partial backwards compatibility (Deprecated)
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  leafCategoryId: objectIdSchema.optional(),
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  addons: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        price: z.coerce.number().min(0),
        gramsPerKg: z.coerce.number().min(0),
      }),
    )
    .optional(),
  /** @deprecated Maintain for backwards compatibility with old records. Use totalFormulaCost instead. */
  finalPrice: z.coerce.number().min(0).optional(),
  /** @deprecated Maintain for backwards compatibility with old records. */
  marginPercent: z.coerce.number().optional(),
});

export type CustomerTeaFormulaInput = z.infer<typeof customerTeaFormulaSchema>;

export type CustomerTeaFormulaLineItem = {
  purchaseBatchCode: string;
  purchaseBatchLineItemId: string;
  ingredientCategory: 'Leaf' | 'Add-On';
  ingredientName: string;
  quantityInGrams: number;
  pricePerGram: number;
  rowCost: number;
};

export type CustomerTeaFormula = {
  id: string;
  customerId: { id: string; name: string } | string;
  formulaCode: string;
  notes?: string;
  totalWeight: number;
  totalFormulaCost: number;
  costPerKg: number;
  costPer100Grams: number;
  isDefault: boolean;
  status: 'Active' | 'Inactive';
  lineItems: CustomerTeaFormulaLineItem[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  // Legacy fields (Deprecated)
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  leafCategoryId?: { id: string; name: string } | string;
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  addons?: { name: string; price: number; gramsPerKg: number }[];
  /** @deprecated Maintain for backwards compatibility with old records. Use totalFormulaCost instead. */
  finalPrice?: number;
  /** @deprecated Maintain for backwards compatibility with old records. */
  marginPercent?: number;
};

export type CustomerTeaFormulaHistory = {
  id: string;
  formulaId: string;
  snapshot: any;
  changedBy?: string;
  changeType: 'Create' | 'Update' | 'Restore';
  createdAt: string;
};
