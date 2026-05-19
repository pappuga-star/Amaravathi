import { z } from 'zod';

export const SYSTEM_SETTINGS_SINGLETON_KEY = 'SYSTEM_SETTINGS' as const;

export const systemCurrencyValues = ['INR', 'USD', 'EUR', 'GBP'] as const;

export const systemSettingsSchema = z
  .object({
    defaultEstateName: z.string().trim().min(2).max(100),
    defaultBagCapacityKg: z.coerce.number().gt(0).max(1000),
    systemCurrency: z.enum(systemCurrencyValues),
    realTimeNotificationsEnabled: z.boolean(),
  })
  .strict();

export type SystemCurrency = (typeof systemCurrencyValues)[number];

export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;

export type SystemSettings = SystemSettingsInput & {
  singletonKey: typeof SYSTEM_SETTINGS_SINGLETON_KEY;
  id: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
};

export const defaultSystemSettings: SystemSettingsInput = {
  defaultEstateName: 'Amaravathi Tea Estates',
  defaultBagCapacityKg: 50,
  systemCurrency: 'INR',
  realTimeNotificationsEnabled: true,
};
