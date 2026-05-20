import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AccessibleIconButton, Button, Card, Input, Select, Textarea } from '@amaravathi/shared-ui';
import { api } from '../lib/api';
import {
  Save,
  Edit3,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { ViewDetailsModal, ViewField } from './ViewDetailsModal';
import { useNotification } from '@/components/NotificationContext';
import { Z_INDEX } from '../constants/zIndex';
import { STICKY_IN_CONTENT } from '../utils/sticky';
import { SEARCH_DEBOUNCE_MS, SEARCH_DEFAULT_LIMIT } from '../search/search.constants';
import { SearchInput } from '../search/SearchInput';
import { useSearch } from '../search/useSearch';

export type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'json' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
};

export function DataModule({
  title,
  endpoint,
  fields,
}: {
  title: string;
  endpoint: string;
  fields: FieldConfig[];
}) {
  const PAGE_SIZE = SEARCH_DEFAULT_LIMIT;
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();

  const defaultFormValues = useMemo(() => {
    const defaults: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      }
    });
    return defaults;
  }, [fields]);

  const [form, setForm] = useState<Record<string, string>>(defaultFormValues);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingRow, setViewingRow] = useState<Record<string, unknown> | null>(
    null,
  );
  const search = useSearch<Record<string, unknown>>({
    moduleName: endpoint,
    debounceMs: SEARCH_DEBOUNCE_MS,
    syncUrl: false,
    initialLimit: PAGE_SIZE,
    queryFn: ({ q, page, limit }) =>
      api<{
        items: Record<string, unknown>[];
        total: number;
        page: number;
        limit: number;
      }>(
        `${endpoint}?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
      ),
  });
  const currentPage = search.page;
  const setCurrentPage = search.setPage;

  // Fetch current user details for role-based administrative gates
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  const { data } = search.query;
  const rows = data?.items ?? [];
  const totalRecords = data?.total ?? 0;
  const pageSize = data?.limit ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const serialStart = (currentPage - 1) * pageSize;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - currentPage) <= 1,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleEdit = (rowData: any) => {
    setEditingId(rowData.id);
    const newForm: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.key === 'password') {
        newForm[field.key] = ''; // Do not pre-populate passwords to keep them secure
      } else {
        newForm[field.key] = String(rowData[field.key] ?? '');
      }
    });
    setForm(newForm);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(defaultFormValues);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoint}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      showToast(`${title} successfully deleted.`, 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: `Delete ${title}`,
      message: `Are you sure you want to delete this ${title.toLowerCase()}?`,
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'serialNumber',
        header: 'S.No',
        cell: (info: any) => serialStart + info.row.index + 1,
      },
      ...fields.slice(0, 5).map((field) => ({
        accessorKey: field.key,
        header: field.label,
        cell: (info: { getValue: () => unknown }) => {
          const val = info.getValue();
          if (field.key === 'password' || field.key === 'passwordHash') {
            return '••••••••';
          }
          return String(val ?? '-');
        },
      })),
      {
        id: 'actions',
        header: 'Actions',
        cell: (info: any) => {
          const rowData = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <AccessibleIconButton
                type="button"
                onClick={() => setViewingRow(rowData)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                label={`View ${title}`}
              >
                <Eye size={13} />
              </AccessibleIconButton>
              <AccessibleIconButton
                type="button"
                onClick={() => handleEdit(rowData)}
                disabled={!canEdit}
                className={`inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-colors ${
                  canEdit
                    ? 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                label={`Edit ${title}`}
              >
                <Edit3 size={13} />
              </AccessibleIconButton>
              <AccessibleIconButton
                type="button"
                onClick={() => handleDelete(rowData.id)}
                disabled={!isAdmin}
                className={`inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-colors ${
                  isAdmin
                    ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                label={`Delete ${title}`}
              >
                <Trash2 size={13} />
              </AccessibleIconButton>
            </div>
          );
        },
      },
    ],
    [fields, canEdit, isAdmin, title, serialStart],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = coercePayload(form, fields);
      if (editingId) {
        return api(`${endpoint}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setForm(defaultFormValues);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      showToast(`${title} successfully saved!`, 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const modalFields: ViewField[] = viewingRow
    ? fields.map((field) => {
        let val = viewingRow[field.key];
        if (field.key === 'password' || field.key === 'passwordHash') {
          val = '••••••••';
        }
        return {
          label: field.label,
          value: val !== undefined && val !== null ? String(val) : '—',
          type: field.key === 'role' ? 'badge' : 'text',
          badgeColor: field.key === 'role' ? 'blue' : undefined,
        };
      })
    : [];

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card className="h-max p-5 rounded-xl border border-slate-300 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-900">
          {editingId ? `Modify ${title}` : `Add ${title}`}
        </h3>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {fields.map((field) => (
            <label
              key={field.key}
              className="grid gap-1.5 text-sm font-semibold text-slate-900"
            >
              <span>{field.label}</span>
              {field.type === 'select' ? (
                <Select
                  value={form[field.key] ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  disabled={!canEdit}
                >
                  <option value="" disabled>Select {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === 'textarea' || field.type === 'json' ? (
                <Textarea
                  className="min-h-24"
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              ) : (
                <Input
                  type={field.type ?? 'text'}
                  placeholder={field.placeholder}
                  value={form[field.key] ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  disabled={!canEdit}
                />
              )}
            </label>
          ))}
          {mutation.error ? (
            <p className="text-sm text-red-600 font-semibold">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex gap-2 mt-2">
            {editingId && (
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 h-10 text-sm font-semibold"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="add"
              className="flex-1 h-10 text-sm font-semibold"
              disabled={mutation.isPending || !canEdit}
            >
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>
      <Card className="min-w-0 p-5 rounded-xl border border-slate-300 bg-white shadow-sm flex flex-col gap-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-slate-900">{title} records</h3>
          <div className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-850 border border-emerald-200">
            Total Records: {totalRecords}
          </div>
        </div>
        <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput
              placeholder="Search"
              value={search.q}
              onChange={search.setQ}
              loading={search.query.isFetching}
            />
          </div>
          <p className="text-[11px] font-semibold text-slate-700">
            Page Size: {pageSize}
          </p>
        </div>
        <div className="max-h-[62vh] overflow-auto rounded-xl border border-slate-300">
          <table className="w-full text-left text-xs">
            <thead
              className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300"
              style={STICKY_IN_CONTENT}
            >
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-4 py-2.5 font-bold text-[11px] uppercase tracking-wide ${
                        header.id.includes('actions')
                          ? 'sticky right-0 bg-slate-100 text-center'
                          : ''
                      }`}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-300">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={fields.length + 1}
                    className="px-4 py-8 text-center text-slate-600 italic text-sm font-medium"
                  >
                    No {title.toLowerCase()} records found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-2.5 text-xs font-medium text-slate-900 ${
                          cell.column.id === 'serialNumber'
                            ? 'text-base font-bold text-slate-800'
                            : cell.column.id === 'actions'
                              ? 'sticky right-0 bg-white text-center'
                              : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div
          className="sticky bottom-0 -mx-5 mt-1 border-t border-slate-300 bg-white/95 px-5 py-2 backdrop-blur"
          style={{ zIndex: Z_INDEX.sticky }}
        >
          <div className="flex flex-col gap-2 pr-16 sm:flex-row sm:items-center sm:justify-between sm:pr-24">
            <p className="text-[11px] font-semibold text-slate-700">
              Showing {rows.length ? serialStart + 1 : 0} to{' '}
              {serialStart + rows.length} of {totalRecords}
            </p>
            <div className="mr-20 flex items-center gap-1.5 sm:mr-24">
              <AccessibleIconButton
                type="button"
                className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm transition-colors duration-200 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                label="Go to first page"
              >
                <ChevronsLeft size={13} />
              </AccessibleIconButton>
              <AccessibleIconButton
                type="button"
                className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm transition-colors duration-200 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                label="Go to previous page"
              >
                <ChevronLeft size={13} />
              </AccessibleIconButton>
              {pageNumbers.map((pageNumber, idx) => {
                const prev = pageNumbers[idx - 1];
                const gapBefore = prev && pageNumber - prev > 1;
                return (
                  <div key={pageNumber} className="flex items-center gap-1.5">
                    {gapBefore ? (
                      <span className="text-[10px] font-bold text-slate-500">...</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`h-7 min-w-7 rounded-md border px-2 text-[11px] font-bold ${
                        currentPage === pageNumber
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </div>
                );
              })}
              <AccessibleIconButton
                type="button"
                className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm transition-colors duration-200 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                label="Go to next page"
              >
                <ChevronRight size={13} />
              </AccessibleIconButton>
              <AccessibleIconButton
                type="button"
                className="inline-flex items-center justify-center h-7 px-2 rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm transition-colors duration-200 hover:bg-slate-50 hover:text-slate-950 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-[11px]"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                label="Go to last page"
              >
                <ChevronsRight size={13} />
              </AccessibleIconButton>
            </div>
          </div>
        </div>
      </Card>

      {viewingRow && (
        <ViewDetailsModal
          title={String(viewingRow.name || viewingRow.email || 'Details')}
          subtitle={`${title} Profile Details`}
          onClose={() => setViewingRow(null)}
          fields={modalFields}
        />
      )}
    </div>
  );
}

function coercePayload(form: Record<string, string>, fields: FieldConfig[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const value = form[field.key];
    if (value === undefined || value === '') return payload;
    payload[field.key] =
      field.type === 'number'
        ? Number(value)
        : field.type === 'date'
          ? new Date(value)
          : field.type === 'json'
            ? JSON.parse(value)
            : value;
    return payload;
  }, {});
}
