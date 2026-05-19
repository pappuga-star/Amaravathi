import mongoose, { Schema } from 'mongoose';
import {
  SYSTEM_CURRENCY_VALUES,
  SYSTEM_SETTINGS_DEFAULTS,
  SYSTEM_SETTINGS_SINGLETON_KEY,
} from '../system-settings.constants.js';

export type SystemSettingsDocument = mongoose.Document & {
  singletonKey: typeof SYSTEM_SETTINGS_SINGLETON_KEY;
  defaultEstateName: string;
  defaultBagCapacityKg: number;
  systemCurrency: (typeof SYSTEM_CURRENCY_VALUES)[number];
  realTimeNotificationsEnabled: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const systemSettingsSchema = new Schema<SystemSettingsDocument>(
  {
    singletonKey: {
      type: String,
      required: true,
      default: SYSTEM_SETTINGS_SINGLETON_KEY,
      enum: [SYSTEM_SETTINGS_SINGLETON_KEY],
      immutable: true,
    },
    defaultEstateName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      default: SYSTEM_SETTINGS_DEFAULTS.defaultEstateName,
    },
    defaultBagCapacityKg: {
      type: Number,
      required: true,
      min: 0.000001,
      max: 1000,
      default: SYSTEM_SETTINGS_DEFAULTS.defaultBagCapacityKg,
    },
    systemCurrency: {
      type: String,
      required: true,
      enum: SYSTEM_CURRENCY_VALUES,
      default: SYSTEM_SETTINGS_DEFAULTS.systemCurrency,
    },
    realTimeNotificationsEnabled: {
      type: Boolean,
      required: true,
      default: SYSTEM_SETTINGS_DEFAULTS.realTimeNotificationsEnabled,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, collection: 'systemsettings' },
);

systemSettingsSchema.index({ singletonKey: 1 }, { unique: true });

export const SystemSettingsModel = mongoose.model<SystemSettingsDocument>(
  'SystemSettings',
  systemSettingsSchema,
);
