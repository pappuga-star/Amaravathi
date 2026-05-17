import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  Coffee,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Settings,
  Users,
  X,
  LogOut,
  Truck,
  Layers,
  Activity,
  Sliders,
  Beaker,
  Calculator,
  Contact,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@amaravathi/shared-ui';
import { clearToken, api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { GlobalSearch } from './GlobalSearch';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

const nav = [
  { to: '/', label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  {
    to: '/purchase-batch',
    label: 'Purchase Batch',
    key: 'purchaseBatches',
    icon: ClipboardList,
  },
  { to: '/sellers', label: 'Sellers (Suppliers)', key: 'sellers', icon: Truck },
  {
    to: '/taste-customization',
    label: 'Customer Customization',
    key: 'customerCustomization',
    icon: Beaker,
  },
  {
    to: '/sales-quotations-planner',
    label: 'Sales & Planner',
    key: 'salesQuotation',
    icon: Calculator,
  },
  { to: '/users', label: 'Users', key: 'users', icon: Users },
  { to: '/reports', label: 'Reports', key: 'reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', key: 'settings', icon: Settings },
];

export function Layout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ role: string }>('/auth/me'),
  });
  const role = me?.role;

  const allowedNav = nav.filter((item) => {
    if (role === 'viewer') {
      return ['/taste-customization', '/purchase-batch'].includes(item.to);
    }
    return true;
  });

  const activeNavItem = allowedNav.find(
    (item) => item.to === location.pathname,
  );
  const title = activeNavItem
    ? t(`nav.${activeNavItem.key}`)
    : t('nav.dashboard');

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition lg:static lg:w-auto ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Amaravathi</p>
            <h1 className="text-base font-bold">Tea Pricing</h1>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="grid gap-1 p-3">
          {allowedNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon size={18} />
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-xs text-slate-500">Admin / {title}</p>
              <h2 className="text-lg font-bold">{title}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                className="h-9 px-3"
                onClick={() =>
                  document.documentElement.classList.toggle('dark')
                }
              >
                <Moon className="h-4 w-4 text-current" />
                <span className="hidden sm:inline">{t('theme')}</span>
              </Button>
              <Button
                variant="default"
                className="h-9 px-3 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                onClick={() => {
                  clearToken();
                  window.location.href = '/login';
                }}
              >
                <LogOut className="h-4 w-4 text-current" />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
