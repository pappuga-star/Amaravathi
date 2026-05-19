import mongoose from 'mongoose';
import {
  SYSTEM_SETTINGS_DEFAULTS,
  SYSTEM_SETTINGS_SINGLETON_KEY,
  type SystemSettingsInput,
} from '../system-settings.constants.js';
import { SystemSettingsModel } from '../models/SystemSettings.js';

function toSystemSettingsDto(doc: {
  _id: mongoose.Types.ObjectId;
  singletonKey: string;
  defaultEstateName: string;
  defaultBagCapacityKg: number;
  systemCurrency: string;
  realTimeNotificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: mongoose.Types.ObjectId | null;
}) {
  return {
    id: String(doc._id),
    singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY,
    defaultEstateName: doc.defaultEstateName,
    defaultBagCapacityKg: Number(doc.defaultBagCapacityKg),
    systemCurrency: doc.systemCurrency,
    realTimeNotificationsEnabled: Boolean(doc.realTimeNotificationsEnabled),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
  };
}

export async function getSystemSettings() {
  const doc = await SystemSettingsModel.findOneAndUpdate(
    { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY },
    {
      $setOnInsert: {
        singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY,
        ...SYSTEM_SETTINGS_DEFAULTS,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
      lean: true,
    },
  );

  if (!doc) throw new Error('Failed to initialize system settings');
  return toSystemSettingsDto(doc);
}

export async function updateSystemSettings(
  payload: SystemSettingsInput,
  userId: string | null,
) {
  const doc = await SystemSettingsModel.findOneAndUpdate(
    { singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY },
    {
      $set: {
        ...payload,
        updatedBy: userId ? new mongoose.Types.ObjectId(userId) : null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        singletonKey: SYSTEM_SETTINGS_SINGLETON_KEY,
        ...SYSTEM_SETTINGS_DEFAULTS,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
      lean: true,
    },
  );

  if (!doc) throw new Error('Failed to update system settings');
  return toSystemSettingsDto(doc);
}
