import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Settings,
  Gauge,
  Users,
  X,
  LogOut,
  Truck,
  Beaker,
  Calculator,
} from 'lucide-react';
import { useState } from 'react';
import { AccessibleIconButton, Button } from '@amaravathi/shared-ui';
import { clearToken } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GlobalSearchFab } from './GlobalSearchFab';
import { GlobalSearchModal } from './GlobalSearchModal';
import { Logo } from './Logo';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { Z_INDEX } from '../constants/zIndex';
import { HEADER_HEIGHT } from '../constants/layout';

const nav = [
  { to: '/', label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  {
    to: '/purchase-batch',
    label: 'Purchase Batch',
    key: 'purchaseBatches',
    icon: ClipboardList,
  },
  {
    to: '/general-items',
    label: 'General Items',
    key: 'generalItems',
    icon: Package,
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
  { to: '/search-admin', label: 'Search Admin', key: 'searchAdmin', icon: Gauge },
];

export function Layout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const searchState = useGlobalSearch();
  const queryClient = useQueryClient();

  const me = queryClient.getQueryData<{ role: string }>(['me']);
  const role = me?.role;

  const allowedNav = nav.filter((item) => {
    if (item.to === '/search-admin') return role === 'admin';
    if (role === 'viewer') {
      return ['/taste-customization', '/purchase-batch', '/general-items'].includes(item.to);
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
        className={`fixed left-0 bottom-0 w-72 overflow-y-auto border-r border-slate-200 bg-white transition lg:static lg:top-auto lg:bottom-auto lg:w-auto lg:overflow-visible ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ top: HEADER_HEIGHT, zIndex: Z_INDEX.drawer }}
      >
        <div className="flex min-h-[52px] items-center justify-between border-b px-4 py-1.5">
          <div className="flex items-center">
            <Logo
              width={132}
              height={48}
              priority
              className="h-auto max-h-12 w-[132px] object-contain"
            />
          </div>
          <AccessibleIconButton
            className="lg:hidden inline-flex items-center justify-center"
            onClick={() => setOpen(false)}
            label="Close navigation"
          >
            <X size={20} />
          </AccessibleIconButton>
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
      <div className="min-w-0" style={{ paddingTop: HEADER_HEIGHT }}>
        <header
          className="fixed top-0 right-0 left-0 border-b bg-white/95 backdrop-blur lg:left-[280px]"
          style={{ zIndex: Z_INDEX.sticky, minHeight: HEADER_HEIGHT }}
        >
          <div className="flex min-h-[72px] h-full items-center justify-between gap-4 px-4 py-2.5 lg:px-8">
            <div className="flex items-center gap-3">
              <AccessibleIconButton
                className="lg:hidden inline-flex items-center justify-center"
                onClick={() => setOpen(true)}
                label="Open navigation"
              >
                <Menu size={22} />
              </AccessibleIconButton>
              <div className="flex flex-col justify-center gap-0.5">
                <p className="text-xs text-slate-500">Admin / {title}</p>
                <h2 className="text-lg font-bold">{title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">
          <Outlet />
        </main>
        <footer className="pb-6 text-center text-xs text-slate-500">
          blend with love by Kalyans-Esparex.in
        </footer>
      </div>

      {/* Floating System-wide Search Elements */}
      <GlobalSearchFab onClick={searchState.open} />
      <GlobalSearchModal
        isOpen={searchState.isOpen}
        onClose={searchState.close}
        query={searchState.query}
        setQuery={searchState.setQuery}
        results={searchState.results}
        totalResults={searchState.totalResults}
        {...(searchState.quality ? { quality: searchState.quality } : {})}
        {...(searchState.suggestions ? { suggestions: searchState.suggestions } : {})}
        isLoading={searchState.isLoading}
        recentSearches={searchState.recentSearches}
        addRecentSearch={searchState.addRecentSearch}
        clearRecentSearches={searchState.clearRecentSearches}
      />
    </div>
  );
}
