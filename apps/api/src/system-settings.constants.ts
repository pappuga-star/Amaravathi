import { z } from 'zod';

export const SYSTEM_SETTINGS_SINGLETON_KEY = 'SYSTEM_SETTINGS' as const;

export const SYSTEM_CURRENCY_VALUES = ['INR', 'USD', 'EUR', 'GBP'] as const;

export const SYSTEM_SETTINGS_DEFAULTS = {
  defaultEstateName: 'Amaravathi Tea Estates',
  defaultBagCapacityKg: 50,
  systemCurrency: 'INR',
  realTimeNotificationsEnabled: true,
} as const;

export const systemSettingsSchema = z
  .object({
    defaultEstateName: z.string().trim().min(2).max(100),
    defaultBagCapacityKg: z.coerce.number().gt(0).max(1000),
    systemCurrency: z.enum(SYSTEM_CURRENCY_VALUES),
    realTimeNotificationsEnabled: z.boolean(),
  })
  .strict();

export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;
