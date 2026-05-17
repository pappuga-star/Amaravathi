import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getToken, api } from './lib/api';
import { useQuery } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import {
  AddPurchaseBatchPage,
  UsersPage,
  SellersPage,
} from './pages/Modules';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { TasteCustomizationMasterPage } from './pages/TasteCustomizationMasterPage';
import { SalesQuotationPlannerPage } from './pages/SalesQuotationPlannerPage';

function Protected() {
  const token = getToken();
  const location = useLocation();

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ name: string; email: string; role: string }>('/auth/me'),
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
          <p className="text-sm font-medium text-slate-500">Checking session...</p>
        </div>
      </main>
    );
  }

  const role = me?.role;

  if (role === 'viewer') {
    const allowedViewerPaths = ['/taste-customization', '/purchase-batch'];
    const currentPath = location.pathname;
    
    if (!allowedViewerPaths.includes(currentPath)) {
      return <Navigate to="/taste-customization" replace />;
    }
  }

  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="purchase-batch" element={<AddPurchaseBatchPage />} />
        <Route path="sellers" element={<SellersPage />} />
        <Route path="taste-customization" element={<TasteCustomizationMasterPage />} />
        
        {/* Legacy redirects */}
        <Route path="add-purchase-batch" element={<Navigate to="/purchase-batch" replace />} />
        <Route path="tea-powder-types" element={<Navigate to="/purchase-batch?tab=types" replace />} />
        <Route path="customers" element={<Navigate to="/taste-customization" replace />} />
        <Route path="leaf-categories" element={<Navigate to="/taste-customization" replace />} />
        <Route path="cutting-types" element={<Navigate to="/taste-customization" replace />} />
        <Route path="taste-parameters" element={<Navigate to="/taste-customization" replace />} />
        <Route path="customer-tea-formulas" element={<Navigate to="/taste-customization" replace />} />
        <Route
          path="sales-quotations-planner"
          element={<SalesQuotationPlannerPage />}
        />
        <Route path="users" element={<UsersPage />} />


        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
