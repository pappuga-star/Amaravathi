import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button, Card, Input } from '@amaravathi/shared-ui';
import { api } from '../lib/api';
import { Save, Edit3, Trash2, Eye } from 'lucide-react';
import { ViewDetailsModal, ViewField } from './ViewDetailsModal';
import { useNotification } from './NotificationContext';

export type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'json';
  placeholder?: string;
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
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [form, setForm] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingRow, setViewingRow] = useState<Record<string, unknown> | null>(null);

  // Fetch current user details for role-based administrative gates
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  const { data } = useQuery({
    queryKey: [endpoint, q],
    queryFn: () =>
      api<{ items: Record<string, unknown>[] }>(
        `${endpoint}?q=${encodeURIComponent(q)}`,
      ),
  });
  const rows = data?.items ?? [];

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
    setForm({});
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
              <button
                type="button"
                onClick={() => setViewingRow(rowData)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                title={`View ${title}`}
              >
                <Eye size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleEdit(rowData)}
                disabled={!canEdit}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-colors ${
                  canEdit
                    ? 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={`Edit ${title}`}
              >
                <Edit3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(rowData.id)}
                disabled={!isAdmin}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 transition-colors ${
                  isAdmin
                    ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={`Delete ${title}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [fields, canEdit, isAdmin, title],
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
      setForm({});
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
      <Card className="h-max p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800">
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
              className="grid gap-1.5 text-sm font-medium text-slate-700"
            >
              <span>{field.label}</span>
              {field.type === 'textarea' || field.type === 'json' ? (
                <textarea
                  className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
            <p className="text-sm text-red-600 font-medium">{mutation.error.message}</p>
          ) : null}
          <div className="flex gap-2 mt-2">
            {editingId && (
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 h-10 text-sm font-medium"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="add"
              className="flex-1 h-10 text-sm font-medium"
              disabled={mutation.isPending || !canEdit}
            >
              <Save className="h-4 w-4 text-current" />
              <span>{editingId ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </form>
      </Card>
      <Card className="min-w-0 p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title} records</h3>
          <div className="relative w-full sm:max-w-xs flex items-center">
            <Input
              className="h-10 text-sm font-normal"
              placeholder="Search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 1} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                    No {title.toLowerCase()} records found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm font-normal text-slate-600">
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
