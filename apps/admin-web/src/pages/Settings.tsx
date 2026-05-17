import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button } from '@amaravathi/shared-ui';
import { api } from '../lib/api';
import { useNotification } from '../components/NotificationContext';
import { User, Settings, Shield, Bell, HelpCircle, Save } from 'lucide-react';

export function SettingsPage() {
  const { showToast } = useNotification();
  // Fetch active user profile from me endpoint
  const { data: me } = useQuery({
    queryKey: ['me-profile'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });

  const [estateName, setEstateName] = useState('Amaravathi Tea Estates');
  const [bagWeight, setBagWeight] = useState('50');
  const [currency, setCurrency] = useState('INR');
  const [systemAlerts, setSystemAlerts] = useState(true);

  // Load local preferences on component mount
  useEffect(() => {
    const savedName = localStorage.getItem('setting_estate_name');
    if (savedName) setEstateName(savedName);
    const savedWeight = localStorage.getItem('setting_bag_weight');
    if (savedWeight) setBagWeight(savedWeight);
    const savedCurrency = localStorage.getItem('setting_currency');
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('setting_estate_name', estateName);
    localStorage.setItem('setting_bag_weight', bagWeight);
    localStorage.setItem('setting_currency', currency);
    showToast('System settings updated successfully!', 'success');
  };

  return (
    <div className="grid gap-8">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-sm text-slate-500">
          Configure your workspace defaults, user preferences, and master
          profiles.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Active User Profile Card */}
        <div className="lg:col-span-1 grid gap-6 h-max">
          <Card className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col items-center text-center gap-4">
            <div className="grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100/50">
              <User size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {me?.name ?? 'System Admin'}
              </h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {me?.role ?? 'admin'}
              </p>
            </div>
            <div className="w-full border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-left text-sm">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Email Address
                </span>
                <span className="font-semibold text-slate-700">
                  {me?.email ?? 'admin@amaravathi.local'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  System Access Level
                </span>
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <Shield size={12} />
                  <span>Full Privileges</span>
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Columns: Master System Configuration Form */}
        <div className="lg:col-span-2 grid gap-6">
          <Card className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="grid size-10 place-items-center rounded-lg bg-slate-50 text-slate-600">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Estates Master Defaults
                </h3>
                <p className="text-xs text-slate-400">
                  Set default parameters for calculations and invoice forms.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="grid gap-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                <span>Default Estate / Corporation Name</span>
                <Input
                  type="text"
                  value={estateName}
                  onChange={(e) => setEstateName(e.target.value)}
                  required
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>Default Bag Capacity Weight (kg)</span>
                  <Input
                    type="number"
                    value={bagWeight}
                    onChange={(e) => setBagWeight(e.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>Standard System Currency</span>
                  <select
                    className="w-full h-10 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 bg-white"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <Bell size={15} className="text-slate-400" />
                    <span>Real-Time Notifications</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    Trigger warnings for anomalous rates or duplicate batch
                    codes.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSystemAlerts(!systemAlerts)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    systemAlerts ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      systemAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5 mt-2">
                <Button
                  type="submit"
                  variant="add"
                  className="h-10 px-6 font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                >
                  <Save className="h-4 w-4 text-current" />
                  <span>Save Configuration</span>
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
                Need Help or Advanced Customizations?
              </h4>
              <p className="text-xs text-slate-400">
                Contact the Amaravathi engineering support team to modify tax
                rates, database scaling, or integrate external ERP systems.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
