import { describe, expect, it } from 'vitest';
import { SYSTEM_SETTINGS_SINGLETON_KEY } from '../system-settings.constants.js';
import { SystemSettingsModel } from './SystemSettings.js';

describe('SystemSettings model', () => {
  it('enforces singleton unique index on singletonKey', () => {
    const indexes = SystemSettingsModel.schema.indexes();
    const singleton = indexes.find(([fields]) => 'singletonKey' in fields);
    expect(singleton).toBeTruthy();
    expect(singleton?.[0]).toEqual({ singletonKey: 1 });
    expect(singleton?.[1]).toMatchObject({ unique: true });
  });

  it('has canonical defaults', () => {
    const doc = new SystemSettingsModel();
    expect(doc.singletonKey).toBe(SYSTEM_SETTINGS_SINGLETON_KEY);
    expect(doc.defaultEstateName).toBe('Amaravathi Tea Estates');
    expect(doc.defaultBagCapacityKg).toBe(50);
    expect(doc.systemCurrency).toBe('INR');
    expect(doc.realTimeNotificationsEnabled).toBe(true);
  });
});
