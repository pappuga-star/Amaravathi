import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star,
  Copy,
  Trash2,
  Download,
  Printer,
  Eye,
  Edit3,
} from 'lucide-react';
import { Button, Card, Input } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { ViewDetailsModal } from '../components/ViewDetailsModal';
import { useNotification } from '../components/NotificationContext';
import { useTranslation } from 'react-i18next';
import { CustomerTeaFormula } from '@amaravathi/shared-types';
import { useDebounce } from '../hooks/useDebounce';

interface SavedFormulasPageProps {
  onEdit?: (formula: CustomerTeaFormula) => void;
}

export const SavedFormulasPage = ({ onEdit }: SavedFormulasPageProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [searchQuery, setSearchQuery] = useState(qParam);

  useEffect(() => {
    setSearchQuery(qParam);
  }, [qParam]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Active' | 'Inactive' | 'Deleted'
  >('All');
  const [viewingFormula, setViewingFormula] =
    useState<CustomerTeaFormula | null>(null);

  // Fetch Customers (for dropdown filter)
  const { data: customersData } = useQuery({
    queryKey: [endpoints.customers],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(
        `${endpoints.customers}?limit=100`,
      ),
  });
  const customers = customersData?.items ?? [];

  // Fetch Formulas
  const { data: formulasData, isLoading } = useQuery({
    queryKey: [
      endpoints.customerTeaFormulas,
      debouncedSearchQuery,
      customerFilter,
    ],
    queryFn: () => {
      let url = `${endpoints.customerTeaFormulas}?q=${encodeURIComponent(debouncedSearchQuery)}&status=all&limit=250`;
      if (customerFilter) url += `&customerId=${customerFilter}`;
      return api<{ items: CustomerTeaFormula[] }>(url);
    },
  });
  const allFormulas = formulasData?.items ?? [];

  const formulas = allFormulas.filter((item) => {
    if (statusFilter === 'All') return !item.deletedAt;
    if (statusFilter === 'Active') return item.status === 'Active' && !item.deletedAt;
    if (statusFilter === 'Inactive') return item.status === 'Inactive' && !item.deletedAt;
    if (statusFilter === 'Deleted') return !!item.deletedAt;
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.customerTeaFormulas}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [endpoints.customerTeaFormulas],
      });
      showToast(t('savedFormulas.deleteSuccess'), 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.customerTeaFormulas}/${id}/duplicate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [endpoints.customerTeaFormulas],
      });
      showToast(t('savedFormulas.duplicateSuccess'), 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.customerTeaFormulas}/${id}/set-default`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [endpoints.customerTeaFormulas],
      });
      showToast(t('savedFormulas.setDefaultSuccess'), 'success');
    },
  });

  const exportToCSV = () => {
    if (formulas.length === 0) {
      showToast(t('savedFormulas.noExport'), 'warning');
      return;
    }
    const headers = [
      'Formula Code',
      'Customer',
      'Total Weight (g)',
      'Total Formula Cost (INR)',
      'Cost Per KG (INR)',
      'Status',
    ];

    const rows = formulas.map((item) => {
      const customerName =
        typeof item.customerId === 'object'
          ? (item.customerId as any).name
          : '-';
      return [
        item.formulaCode,
        customerName,
        item.totalWeight,
        item.totalFormulaCost,
        item.costPerKg,
        item.status,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.join(','),
        ...rows.map((e) =>
          e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','),
        ),
      ].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `customer_tea_formulas_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    total: allFormulas.filter((f) => !f.deletedAt).length,
    active: allFormulas.filter((f) => f.status === 'Active' && !f.deletedAt).length,
    defaults: allFormulas.filter((f) => f.isDefault && !f.deletedAt).length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {t('savedFormulas.totalFormulas')}
            </p>
            <h4 className="text-2xl font-bold text-slate-800">{stats.total}</h4>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {t('savedFormulas.active')}
            </p>
            <h4 className="text-2xl font-bold text-slate-800">
              {stats.active}
            </h4>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              {t('savedFormulas.defaultFormulas')}
            </p>
            <h4 className="text-2xl font-bold text-slate-800">
              {stats.defaults}
            </h4>
          </div>
        </Card>
      </div>

      {/* Table Panel */}
      <Card className="p-4 border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col gap-3">
        {/* Filters Bar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Active', 'Inactive', 'Deleted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
            >
              <option value="">{t('savedFormulas.allCustomers')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <Button
              onClick={exportToCSV}
              variant="secondary"
              className="h-9 px-3 bg-white text-xs gap-1.5 hidden sm:flex"
            >
              <Download size={14} /> {t('savedFormulas.exportCsv')}
            </Button>
            <Button
              onClick={() => window.print()}
              variant="secondary"
              className="h-9 px-3 bg-white text-xs gap-1.5 hidden sm:flex"
            >
              <Printer size={14} /> {t('savedFormulas.print')}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2">
                  {t('savedFormulas.columns.customer')}
                </th>
                <th className="px-3 py-2">
                  {t('savedFormulas.columns.totalWeight')}
                </th>
                <th className="px-3 py-2">
                  {t('savedFormulas.columns.costPerKg')}
                </th>
                <th className="px-3 py-2">
                  {t('savedFormulas.columns.status')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('savedFormulas.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-slate-400 text-sm italic"
                  >
                    {t('savedFormulas.loading')}
                  </td>
                </tr>
              ) : formulas.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-slate-400 text-sm italic"
                  >
                    {t('savedFormulas.noFormulas')}
                  </td>
                </tr>
              ) : (
                formulas.map((item) => {
                  const isDeleted = !!item.deletedAt;
                  const customerName =
                    typeof item.customerId === 'object'
                      ? (item.customerId as any).name
                      : t('savedFormulas.unknown');

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${isDeleted ? 'opacity-60 bg-red-50/20' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span>{customerName}</span>
                          {item.isDefault && (
                            <Star
                              size={12}
                              className="text-amber-500 fill-amber-500 flex-shrink-0"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 text-xs">
                        {item.totalWeight}g
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-emerald-700">
                          ₹{(item.costPerKg || 0).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ₹{(item.costPer100Grams || 0).toFixed(2)} / 100g
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                            isDeleted
                              ? 'bg-red-100 text-red-700'
                              : item.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isDeleted
                            ? t('savedFormulas.dialog.deleted')
                            : item.status === 'Active'
                              ? t('savedFormulas.active')
                              : item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => setViewingFormula(item)}
                            className="h-8 px-2.5 bg-white text-blue-600 border-blue-100 hover:bg-blue-50 text-xs"
                          >
                            <Eye size={13} className="mr-1" />{' '}
                            {t('savedFormulas.actions.view')}
                          </Button>
                          {!isDeleted && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onEdit) {
                                    onEdit(item);
                                  } else {
                                    navigate(`/customer-formulas/edit/${item.id}`);
                                  }
                                }}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all focus:outline-none"
                                title={t('savedFormulas.actions.edit')}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  duplicateMutation.mutate(item.id)
                                }
                                disabled={duplicateMutation.isPending}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all focus:outline-none disabled:opacity-40"
                                title={t('savedFormulas.actions.duplicate')}
                              >
                                <Copy size={13} />
                              </button>
                              {!item.isDefault && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDefaultMutation.mutate(item.id)
                                  }
                                  disabled={setDefaultMutation.isPending}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 active:scale-95 transition-all focus:outline-none disabled:opacity-40"
                                  title={t('savedFormulas.actions.setDefault')}
                                >
                                  <Star size={13} className="text-slate-400" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed = await confirm({
                                    title: t(
                                      'savedFormulas.dialog.deleteTitle',
                                    ),
                                    message: t(
                                      'savedFormulas.dialog.deleteConfirm',
                                    ),
                                    variant: 'danger',
                                  });
                                  if (confirmed) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all focus:outline-none disabled:opacity-40"
                                title={t('savedFormulas.actions.delete')}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Details Modal */}
      {viewingFormula && (
        <ViewDetailsModal
          title={`Formula: ${viewingFormula.formulaCode}`}
          subtitle={`Customer: ${
            typeof viewingFormula.customerId === 'object'
              ? (viewingFormula.customerId as any).name
              : viewingFormula.customerId
          }`}
          onClose={() => setViewingFormula(null)}
          onEdit={() => {
            const formulaId = viewingFormula.id;
            setViewingFormula(null);
            if (onEdit) {
              onEdit(viewingFormula);
            } else {
              navigate(`/customer-formulas/edit/${formulaId}`);
            }
          }}
          isFormula={true}
          fields={[
            {
              label: t('savedFormulas.modal.totalWeight'),
              value: viewingFormula.totalWeight,
            },
            {
              label: t('savedFormulas.modal.totalCost'),
              value: viewingFormula.totalFormulaCost || 0,
            },
            {
              label: 'Cost Per Gram',
              value: viewingFormula.totalWeight > 0 ? (viewingFormula.totalFormulaCost / viewingFormula.totalWeight) : 0,
            },
            {
              label: t('savedFormulas.modal.costPerKg'),
              value: viewingFormula.costPerKg || 0,
            },
            {
              label: t('savedFormulas.modal.notes'),
              value: viewingFormula.notes || '—',
            },
          ]}
          customBody={
            <div className="border border-slate-100 rounded-xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-3">
                {t('savedFormulas.modal.ingredients')}
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-1.5">
                        {t('savedFormulas.modal.batchCode')}
                      </th>
                      <th className="px-2 py-1.5">
                        {t('savedFormulas.modal.category')}
                      </th>
                      <th className="px-2 py-1.5">
                        {t('savedFormulas.modal.ingredientName')}
                      </th>
                      <th className="px-2 py-1.5 text-right">
                        {t('savedFormulas.modal.qtyGrams')}
                      </th>
                      <th className="px-2 py-1.5 text-right">
                        {t('savedFormulas.modal.priceGram')}
                      </th>
                      <th className="px-2 py-1.5 text-right">
                        {t('savedFormulas.modal.cost')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {viewingFormula.lineItems &&
                    viewingFormula.lineItems.length > 0 ? (
                      viewingFormula.lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-2 py-1.5 font-mono font-medium text-slate-600">
                            {item.purchaseBatchCode}
                          </td>
                          <td className="px-2 py-1.5 text-slate-500">
                            {item.ingredientCategory}
                          </td>
                          <td className="px-2 py-1.5 font-semibold text-slate-800">
                            {item.ingredientName}
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-700">
                            {item.quantityInGrams}g
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-500">
                            ₹{item.pricePerGram.toFixed(4)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-bold text-slate-700">
                            ₹{item.rowCost.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-4 text-center text-slate-400 italic"
                        >
                          {t('savedFormulas.modal.noLineItems')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
};
