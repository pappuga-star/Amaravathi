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

export const objectIdSchema = z.string().min(1);
export const mobileSchema = z.string().trim().min(7).max(20);

export const userSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).optional(),
  role: z.enum(roles),
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

export const purchaseBatchItemSchema = z.object({
  subSerialNumber: z.number().int().positive().optional(),
  teaPowderType: z.string().trim().min(1),
  ratePerKg: z.coerce.number().positive(),
  ingredientCategory: z.enum(['Leaf', 'Add-On']).optional(),
  pricePerGram: z.coerce.number().optional(),
  availableStockInGrams: z.coerce.number().optional(),
});

export const purchaseBatchSchema = z.object({
  serialNumber: z.number().int().positive().optional(),
  numberOfBags: z.coerce.number().int().positive(),
  purchaseDate: z.coerce.date(),
  billNumber: z.string().trim().min(1),
  sellerName: z.string().trim().min(1),
  batchCode: z.string().trim().optional(),
  items: z.array(purchaseBatchItemSchema).min(1),
});

export const purchaseBatchSearchSchema = z.object({
  q: z.string().trim().min(1),
});

export type UserInput = z.infer<typeof userSchema>;
export type TeaPowderTypeInput = z.infer<typeof teaPowderTypeSchema>;

export type PurchaseBatchInput = z.infer<typeof purchaseBatchSchema>;
export type PurchaseBatchItemInput = z.infer<typeof purchaseBatchItemSchema>;

export const sellerSchema = z.object({
  name: z.string().trim().min(2),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type SellerInput = z.infer<typeof sellerSchema>;

export const leafCategorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export const cuttingTypeSchema = z.object({
  name: z.string().trim().min(1),
  basePrice: z.coerce.number(),
  leafCategoryId: objectIdSchema,
  description: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export type LeafCategoryInput = z.infer<typeof leafCategorySchema>;
export type CuttingTypeInput = z.infer<typeof cuttingTypeSchema>;

export type LeafCategory = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CuttingType = {
  id: string;
  name: string;
  basePrice: number;
  leafCategoryId: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const customerSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().optional(),
  mobileNumber: z.string().trim().optional(),
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
  subSerialNumber: number;
  teaPowderType: string;
  ratePerKg: number;
  ingredientCategory?: 'Leaf' | 'Add-On';
  pricePerGram?: number;
  availableStockInGrams?: number;
};

export type PurchaseBatch = {
  id: string;
  serialNumber: number;
  numberOfBags: number;
  purchaseDate: string;
  billNumber: string;
  sellerName: string;
  batchCode: string;
  items: PurchaseBatchItem[];
  createdAt: string;
  updatedAt: string;
};

export const customerTeaFormulaSchema = z.object({
  customerId: objectIdSchema,
  formulaCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  totalWeight: z.coerce.number().min(0),
  totalFormulaCost: z.coerce.number().min(0),
  costPerKg: z.coerce.number().min(0),
  costPer100Grams: z.coerce.number().min(0),
  isDefault: z.boolean().default(false),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  
  lineItems: z.array(z.object({
    purchaseBatchCode: z.string().trim().min(1),
    purchaseBatchLineItemId: z.string().trim().min(1),
    ingredientCategory: z.enum(['Leaf', 'Add-On']),
    ingredientName: z.string().trim().min(1),
    quantityInGrams: z.coerce.number().positive(),
    pricePerGram: z.coerce.number().min(0),
    rowCost: z.coerce.number().min(0),
  })).min(1),

  // Legacy fields for partial backwards compatibility (Deprecated)
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  leafCategoryId: objectIdSchema.optional(),
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  cuttingTypeId: objectIdSchema.optional(),
  /** @deprecated Maintain for backwards compatibility with old records. Use lineItems instead. */
  addons: z.array(z.object({
    name: z.string().trim().min(1),
    price: z.coerce.number().min(0),
    gramsPerKg: z.coerce.number().min(0),
  })).optional(),
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
  cuttingTypeId?: { id: string; name: string; basePrice: number } | string;
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
