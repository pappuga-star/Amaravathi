import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button } from '@amaravathi/shared-ui';
import { type SystemSettingsInput } from '@amaravathi/shared-types';
import { api } from '../lib/api';
import { useNotification } from '@/components/NotificationContext';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { User, Settings, Shield, Bell, HelpCircle, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
] as const;

export function SettingsPage() {
  const { t } = useTranslation();
  const { showToast, showError } = useNotification();

  const { data: me } = useQuery({
    queryKey: ['me-profile'],
    queryFn: () => api<{ name: string; email: string; role: string }>('/auth/me'),
  });

  const {
    data: settings,
    isLoading,
    isSaving,
    saveSystemSettings,
  } = useSystemSettings();

  const [form, setForm] = useState<SystemSettingsInput>({
    defaultEstateName: 'Amaravathi Tea Estates',
    defaultBagCapacityKg: 50,
    systemCurrency: 'INR',
    realTimeNotificationsEnabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      defaultEstateName: settings.defaultEstateName,
      defaultBagCapacityKg: settings.defaultBagCapacityKg,
      systemCurrency: settings.systemCurrency,
      realTimeNotificationsEnabled: settings.realTimeNotificationsEnabled,
    });
  }, [settings]);

  const canUpdate = useMemo(() => {
    const role = String(me?.role ?? '').toLowerCase();
    return role === 'admin' || role === 'super_admin';
  }, [me?.role]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSystemSettings(form);
      showToast(t('settings.saveSuccess'), 'success');
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {t('settings.title')}
        </h2>
        <p className="text-sm text-slate-500">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 grid gap-6 h-max">
          <Card className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center text-center gap-4">
            <div className="grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100/50">
              <User size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {me?.name ?? t('settings.systemAdmin')}
              </h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {me?.role ?? 'admin'}
              </p>
            </div>
            <div className="w-full border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-left text-sm">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  {t('settings.emailAddress')}
                </span>
                <span className="font-semibold text-slate-700">
                  {me?.email ?? 'admin@amaravathi.local'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  {t('settings.accessLevel')}
                </span>
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <Shield size={12} />
                  <span>{t('settings.fullPrivileges')}</span>
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 grid gap-6">
          <Card className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid size-10 place-items-center rounded-lg bg-slate-50 text-slate-600">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {t('settings.masterDefaults')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('settings.masterDefaultsDesc')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="grid gap-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                <span>{t('settings.estateName')}</span>
                <Input
                  type="text"
                  value={form.defaultEstateName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, defaultEstateName: e.target.value }))
                  }
                  minLength={2}
                  maxLength={100}
                  required
                  disabled={isLoading || isSaving}
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>{t('settings.bagWeight')}</span>
                  <Input
                    type="number"
                    value={String(form.defaultBagCapacityKg)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultBagCapacityKg: Number(e.target.value || 0),
                      }))
                    }
                    min={0.000001}
                    max={1000}
                    step="any"
                    required
                    disabled={isLoading || isSaving}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>{t('settings.currency')}</span>
                  <select
                    className="w-full h-10 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 bg-white"
                    value={form.systemCurrency}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        systemCurrency: e.target.value as SystemSettingsInput['systemCurrency'],
                      }))
                    }
                    disabled={isLoading || isSaving}
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Bell size={15} className="text-slate-400" />
                    <span>{t('settings.realtimeNotifications')}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {t('settings.triggerWarnings')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      realTimeNotificationsEnabled:
                        !prev.realTimeNotificationsEnabled,
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    form.realTimeNotificationsEnabled ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                  title="Toggle real-time notifications"
                  aria-label="Toggle real-time notifications"
                  aria-pressed={form.realTimeNotificationsEnabled}
                  disabled={isLoading || isSaving}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.realTimeNotificationsEnabled
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5 mt-2">
                <Button
                  type="submit"
                  variant="add"
                  disabled={!canUpdate || isLoading || isSaving}
                  className="h-10 px-6 font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                >
                  <Save className="h-4 w-4 text-current" />
                  <span>{isSaving ? 'Saving...' : t('settings.saveConfig')}</span>
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-4">
            <div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <HelpCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                {t('settings.needHelp')}
              </h4>
              <p className="text-xs text-slate-400">
                {t('settings.contactSupport')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
