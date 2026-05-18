import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getToken, api } from './lib/api';
import { useQuery } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { AddPurchaseBatchPage, UsersPage, SellersPage } from './pages/Modules';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { TasteCustomizationMasterPage } from './pages/TasteCustomizationMasterPage';
import { CustomerFormulasPage } from './pages/CustomerFormulasPage';
import { SalesQuotationPlannerPage } from './pages/SalesQuotationPlannerPage';
import { GeneralItemsPage } from './pages/GeneralItemsPage';

import { ErrorBoundary } from './components/ErrorBoundary';

function Protected() {
  const token = getToken();
  const location = useLocation();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
    enabled: !!token,
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm font-medium text-slate-500">
            Checking session...
          </p>
        </div>
      </main>
    );
  }

  const role = me?.role;

  if (role === 'viewer') {
    const allowedViewerPaths = [
      '/taste-customization',
      '/purchase-batch',
      '/general-items',
    ];
    const currentPath = location.pathname;

    if (!allowedViewerPaths.includes(currentPath)) {
      return <Navigate to="/taste-customization" replace />;
    }
  }

  return <Layout />;
}

export default function App() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[App focus] Window visibility state changed to visible. Validating token integrity...');
        }
        const token = getToken();
        if (!token) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[App focus] Token absent or expired upon page restore. Navigating safely to login.');
          }
          // Safely force window reload to clear caches and trigger routing logic
          window.location.href = '/login';
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="purchase-batch" element={<ErrorBoundary><AddPurchaseBatchPage /></ErrorBoundary>} />
        <Route path="general-items" element={<ErrorBoundary><GeneralItemsPage /></ErrorBoundary>} />
        <Route path="sellers" element={<ErrorBoundary><SellersPage /></ErrorBoundary>} />
        <Route
          path="taste-customization"
          element={<ErrorBoundary><TasteCustomizationMasterPage /></ErrorBoundary>}
        />
        <Route
          path="customer-formulas/edit/:id"
          element={<ErrorBoundary><CustomerFormulasPage /></ErrorBoundary>}
        />

        {/* Legacy redirects */}
        <Route
          path="add-purchase-batch"
          element={<Navigate to="/purchase-batch" replace />}
        />
        <Route
          path="tea-powder-types"
          element={<Navigate to="/purchase-batch?tab=types" replace />}
        />
        <Route
          path="customers"
          element={<Navigate to="/taste-customization" replace />}
        />
        <Route
          path="leaf-categories"
          element={<Navigate to="/taste-customization" replace />}
        />

        <Route
          path="taste-parameters"
          element={<Navigate to="/taste-customization" replace />}
        />
        <Route
          path="customer-tea-formulas"
          element={<Navigate to="/taste-customization" replace />}
        />
        <Route
          path="sales-quotations-planner"
          element={<ErrorBoundary><SalesQuotationPlannerPage /></ErrorBoundary>}
        />
        <Route path="users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />

        <Route path="reports" element={<ErrorBoundary><ReportsPage /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
