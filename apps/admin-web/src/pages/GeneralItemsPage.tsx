import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Input } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { formatCurrency } from '@amaravathi/shared-utils';
import { useDebounce } from '../hooks/useDebounce';
import { useNotification } from '../components/NotificationContext';
import { Edit3, Eye, Plus, Printer, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

type Unit = 'Kg' | 'Grams' | 'Pieces' | 'Boxes' | 'Packets' | 'Dozens' | 'Liters';

const UNIT_OPTIONS: Unit[] = [
  'Kg',
  'Grams',
  'Pieces',
  'Boxes',
  'Packets',
  'Dozens',
  'Liters',
];

type GeneralItemsMasterItem = {
  id: string;
  itemName: string;
  defaultUnit: Unit;
  isActive: boolean;
};

type SellerOption = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
};

function SupplierAutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  onSearchTermChange,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onSearchTermChange?: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = options
    .filter((opt) => opt.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(e) => {
          const next = e.target.value;
          setSearch(next);
          onChange(next);
          onSearchTermChange?.(next);
          setIsOpen(true);
        }}
        onFocus={() => {
          onSearchTermChange?.(search);
          setIsOpen(true);
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isOpen && filtered.length > 0 && !disabled ? (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5">
          {filtered.map((opt, i) => (
            <li
              key={`${opt}-${i}`}
              className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch(opt);
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type GeneralItemLineItem = {
  id?: string;
  particulars: string;
  quantity: number;
  unit: Unit;
  ratePerUnit: number;
  amount: number;
};

type GeneralItemPurchase = {
  id: string;
  purchaseDate: string;
  billNumber: string;
  supplierName: string;
  notes: string;
  lineItems: GeneralItemLineItem[];
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
};

type RateHistoryRow = {
  purchaseDate: string;
  supplierName: string;
  billNumber: string;
  quantity: number;
  unit: Unit;
  ratePerUnit: number;
  amount: number;
};

type RateHistoryResponse = {
  stats: {
    lastPurchaseDate: string | null;
    lastRate: number | null;
    lowestRate: number | null;
    highestRate: number | null;
    averageRate: number | null;
  };
  history: RateHistoryRow[];
};

type StockSummaryRow = {
  particulars: string;
  unit: Unit;
  totalPurchasedQuantity: number;
  totalConsumedQuantity: number;
  currentStock: number;
};

type FlatRow = {
  purchaseId: string;
  purchaseDate: string;
  billNumber: string;
  supplierName: string;
  notes: string;
  totalAmount: number;
  particulars: string;
  quantity: number;
  unit: Unit;
  ratePerUnit: number;
  amount: number;
};

function createLineItem(defaultUnit: Unit = 'Pieces'): GeneralItemLineItem {
  return {
    particulars: '',
    quantity: 0,
    unit: defaultUnit,
    ratePerUnit: 0,
    amount: 0,
  };
}

function toDateInputValue(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function downloadCsv(fileName: string, rows: string[][]) {
  const csvContent = rows
    .map((row) =>
      row
        .map((col) => `"${String(col ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function GeneralItemsForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isEditing,
  isSaving,
  canEdit,
  supplierOptions,
  onOpenSupplierModal,
  onSupplierSearchTermChange,
  masterItems,
  rateComparison,
  selectedRowIndex,
  setSelectedRowIndex,
}: {
  form: {
    purchaseDate: string;
    billNumber: string;
    supplierName: string;
    notes: string;
    lineItems: GeneralItemLineItem[];
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      purchaseDate: string;
      billNumber: string;
      supplierName: string;
      notes: string;
      lineItems: GeneralItemLineItem[];
    }>
  >;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  isSaving: boolean;
  canEdit: boolean;
  supplierOptions: string[];
  onOpenSupplierModal: () => void;
  onSupplierSearchTermChange: (value: string) => void;
  masterItems: GeneralItemsMasterItem[];
  rateComparison: React.ReactNode;
  selectedRowIndex: number;
  setSelectedRowIndex: (index: number) => void;
}) {
  const masterByName = useMemo(
    () =>
      new Map(
        masterItems.map((item) => [item.itemName.trim().toLowerCase(), item]),
      ),
    [masterItems],
  );

  const updateLine = (
    index: number,
    patch: Partial<GeneralItemLineItem>,
    inferDefaultUnit = false,
  ) => {
    setForm((prev) => {
      const next = [...prev.lineItems];
      const current = next[index] || createLineItem();
      let updated: GeneralItemLineItem = {
        ...current,
        ...patch,
      };

      if (inferDefaultUnit && patch.particulars !== undefined) {
        const match = masterByName.get(patch.particulars.trim().toLowerCase());
        if (match) {
          updated = {
            ...updated,
            unit: match.defaultUnit,
          };
        }
      }

      const quantity = Number(updated.quantity || 0);
      const ratePerUnit = Number(updated.ratePerUnit || 0);
      updated.amount = Number((quantity * ratePerUnit).toFixed(2));
      next[index] = updated;

      return {
        ...prev,
        lineItems: next,
      };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createLineItem()],
    }));
    setSelectedRowIndex(form.lineItems.length);
  };

  const removeLine = (index: number) => {
    setForm((prev) => {
      const next = prev.lineItems.filter((_, i) => i !== index);
      return {
        ...prev,
        lineItems: next.length ? next : [createLineItem()],
      };
    });
    if (selectedRowIndex >= index && selectedRowIndex > 0) {
      setSelectedRowIndex(selectedRowIndex - 1);
    }
  };

  return (
    <Card className="grid gap-5 p-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          {isEditing ? 'Edit General Item Purchase' : 'New General Item Purchase'}
        </h3>
        <p className="text-xs text-slate-500">
          Track non-tea purchases with supplier rate validation and stock updates.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Purchase Date">
          <Input
            type="date"
            value={form.purchaseDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))
            }
            disabled={!canEdit}
          />
        </Field>

        <Field label="Bill Number">
          <Input
            value={form.billNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, billNumber: e.target.value }))
            }
            placeholder="Optional"
            disabled={!canEdit}
          />
        </Field>

        <Field label="Supplier Name">
          <div className="grid gap-2">
            <SupplierAutocompleteInput
              value={form.supplierName}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, supplierName: value }))
              }
              onSearchTermChange={onSupplierSearchTermChange}
              options={supplierOptions}
              placeholder="Select or type supplier"
              disabled={!canEdit}
            />
            <div>
              <Button type="button" className="h-8 px-3 text-xs" onClick={onOpenSupplierModal} disabled={!canEdit}>
                <Plus size={12} />
                New Supplier
              </Button>
            </div>
          </div>
        </Field>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={2}
            disabled={!canEdit}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </Field>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[860px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Particulars</th>
              <th className="px-3 py-2 text-left">Quantity</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Rate Per Unit</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {form.lineItems.map((item, index) => (
              <tr
                key={index}
                className={index === selectedRowIndex ? 'bg-emerald-50/40' : ''}
              >
                <td className="px-3 py-2">
                  <Input
                    list="general-items-master"
                    value={item.particulars}
                    onFocus={() => setSelectedRowIndex(index)}
                    onChange={(e) =>
                      updateLine(index, { particulars: e.target.value }, true)
                    }
                    placeholder="e.g. Tea Glass"
                    disabled={!canEdit}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    value={item.quantity || ''}
                    onFocus={() => setSelectedRowIndex(index)}
                    onChange={(e) =>
                      updateLine(index, {
                        quantity: Number(e.target.value || 0),
                      })
                    }
                    disabled={!canEdit}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.unit}
                    onFocus={() => setSelectedRowIndex(index)}
                    onChange={(e) =>
                      updateLine(index, { unit: e.target.value as Unit })
                    }
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.ratePerUnit || ''}
                    onFocus={() => setSelectedRowIndex(index)}
                    onChange={(e) =>
                      updateLine(index, {
                        ratePerUnit: Number(e.target.value || 0),
                      })
                    }
                    disabled={!canEdit}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={item.amount.toFixed(2)}
                    readOnly
                    className="bg-slate-50 font-semibold"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="h-9 px-2"
                      onClick={addLine}
                      disabled={!canEdit}
                    >
                      <Plus size={14} />
                    </Button>
                    <Button
                      type="button"
                      className="h-9 px-2"
                      onClick={() => removeLine(index)}
                      disabled={!canEdit}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="general-items-master">
        {masterItems
          .filter((item) => item.isActive)
          .map((item) => (
            <option key={item.id} value={item.itemName} />
          ))}
      </datalist>

      {rateComparison}

      <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {isEditing && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel Edit
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                billNumber: '',
                notes: '',
                lineItems: [createLineItem()],
              }))
            }
            disabled={!canEdit || isSaving}
          >
            Clear Form
          </Button>
          <Button type="button" variant="add" onClick={onSubmit} disabled={!canEdit || isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Update Purchase' : 'Save Purchase'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NewSupplierModal({
  open,
  canEdit,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean;
  canEdit: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    phone?: string;
    address?: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!open) {
      setName('');
      setPhone('');
      setAddress('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-bold text-slate-900">New Supplier</h4>
          <Button className="h-8 px-2" onClick={onClose}>Close</Button>
        </div>
        <div className="grid gap-3">
          <Field label="Supplier Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Mobile Number">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} />
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit} />
          </Field>
          <p className="text-xs text-slate-500">Address is collected for workflow context and is not persisted in current supplier schema.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              variant="add"
              disabled={!canEdit || isSaving || !name.trim()}
              onClick={() => onSave({ name: name.trim(), phone: phone.trim(), address: address.trim() })}
            >
              {isSaving ? 'Saving...' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RateComparisonCard({
  stats,
  currentRate,
  totalPurchaseAmount,
}: {
  stats: RateHistoryResponse['stats'] | null;
  currentRate: number;
  totalPurchaseAmount: number;
}) {
  const lastRate = stats?.lastRate ?? null;
  const averageRate = stats?.averageRate ?? null;
  const avgDiff = averageRate && currentRate ? currentRate - averageRate : 0;
  const avgPct = averageRate && currentRate ? (avgDiff / averageRate) * 100 : 0;

  const alert =
    averageRate === null || currentRate <= 0
      ? { text: 'No previous purchase for this supplier and item.', cls: 'bg-slate-50 text-slate-700 border-slate-200' }
      : Math.abs(avgPct) <= 5
      ? {
          text: `Near Average: ${avgPct >= 0 ? '+' : ''}${avgPct.toFixed(2)}% vs average`,
          cls: 'bg-amber-50 text-amber-700 border-amber-200',
        }
      : avgDiff > 0
      ? {
          text: `Higher Than Average: +${avgDiff.toFixed(2)} (${avgPct.toFixed(2)}%)`,
          cls: 'bg-red-50 text-red-700 border-red-200',
        }
      : avgDiff < 0
      ? {
          text: `Lower Than Average: ${avgDiff.toFixed(2)} (${avgPct.toFixed(2)}%)`,
          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }
      : {
          text: 'Price is same as average rate.',
          cls: 'bg-slate-50 text-slate-700 border-slate-200',
        };

  return (
    <Card className="grid gap-3 border-dashed">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">Rate Comparison</h4>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total Purchase Amount</p>
          <p className="text-sm font-bold text-slate-800">{formatCurrency(totalPurchaseAmount)}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
        <p>Last Purchase Date: <strong>{stats?.lastPurchaseDate ? new Date(stats.lastPurchaseDate).toLocaleDateString('en-IN') : 'N/A'}</strong></p>
        <p>Last Rate: <strong>{lastRate !== null ? formatCurrency(lastRate) : 'N/A'}</strong></p>
        <p>Lowest Rate: <strong>{stats?.lowestRate !== null && stats?.lowestRate !== undefined ? formatCurrency(stats.lowestRate) : 'N/A'}</strong></p>
        <p>Highest Rate: <strong>{stats?.highestRate !== null && stats?.highestRate !== undefined ? formatCurrency(stats.highestRate) : 'N/A'}</strong></p>
        <p>Average Rate: <strong>{averageRate !== null && averageRate !== undefined ? formatCurrency(averageRate) : 'N/A'}</strong></p>
        <p>Current Rate: <strong>{currentRate > 0 ? formatCurrency(currentRate) : 'N/A'}</strong></p>
      </div>
      <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${alert.cls}`}>
        {alert.text}
      </div>
    </Card>
  );
}

function StockSummaryCard({ stockRows }: { stockRows: StockSummaryRow[] }) {
  return (
    <Card className="grid gap-3">
      <h4 className="text-sm font-bold text-slate-800">Current Stock Summary</h4>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[680px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Particulars</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Purchased</th>
              <th className="px-3 py-2 text-left">Consumed</th>
              <th className="px-3 py-2 text-left">Current Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stockRows.map((row) => (
              <tr key={`${row.particulars}-${row.unit}`}>
                <td className="px-3 py-2 font-medium">{row.particulars}</td>
                <td className="px-3 py-2">{row.unit}</td>
                <td className="px-3 py-2">{row.totalPurchasedQuantity}</td>
                <td className="px-3 py-2">{row.totalConsumedQuantity}</td>
                <td className="px-3 py-2 font-semibold text-emerald-700">{row.currentStock}</td>
              </tr>
            ))}
            {stockRows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>
                  No stock records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GeneralItemsViewDialog({
  purchase,
  onClose,
  onEdit,
}: {
  purchase: GeneralItemPurchase;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h4 className="font-bold">General Item Purchase Details</h4>
            <p className="text-xs text-slate-500">
              {purchase.supplierName} • {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="h-8" onClick={onEdit}>
              <Edit3 size={14} />
            </Button>
            <Button className="h-8" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="grid gap-3 p-4 text-sm">
          <p><strong>Bill Number:</strong> {purchase.billNumber || 'N/A'}</p>
          <p><strong>Notes:</strong> {purchase.notes || 'N/A'}</p>
          <p><strong>Total Amount:</strong> {formatCurrency(purchase.totalAmount)}</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Particulars</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-left">Rate</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.lineItems.map((line, index) => (
                  <tr key={`${purchase.id}-${index}`}>
                    <td className="px-3 py-2">{line.particulars}</td>
                    <td className="px-3 py-2">{line.quantity}</td>
                    <td className="px-3 py-2">{line.unit}</td>
                    <td className="px-3 py-2">{line.ratePerUnit}</td>
                    <td className="px-3 py-2">{formatCurrency(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneralItemsTable({
  rows,
  canEdit,
  isAdmin,
  onView,
  onEdit,
  onDelete,
}: {
  rows: FlatRow[];
  canEdit: boolean;
  isAdmin: boolean;
  onView: (purchaseId: string) => void;
  onEdit: (purchaseId: string) => void;
  onDelete: (purchaseId: string) => void;
}) {
  return (
    <Card className="grid gap-3">
      <h4 className="text-sm font-bold text-slate-800">General Items Purchase Register</h4>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-[1080px] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Purchase Date</th>
              <th className="px-3 py-2 text-left">Bill Number</th>
              <th className="px-3 py-2 text-left">Supplier Name</th>
              <th className="px-3 py-2 text-left">Particulars</th>
              <th className="px-3 py-2 text-left">Quantity</th>
              <th className="px-3 py-2 text-left">Unit</th>
              <th className="px-3 py-2 text-left">Rate Per Unit</th>
              <th className="px-3 py-2 text-left">Amount</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${row.purchaseId}-${index}`}>
                <td className="px-3 py-2">{new Date(row.purchaseDate).toLocaleDateString('en-IN')}</td>
                <td className="px-3 py-2">{row.billNumber || 'N/A'}</td>
                <td className="px-3 py-2">{row.supplierName}</td>
                <td className="px-3 py-2">{row.particulars}</td>
                <td className="px-3 py-2">{row.quantity}</td>
                <td className="px-3 py-2">{row.unit}</td>
                <td className="px-3 py-2">{row.ratePerUnit}</td>
                <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Button className="h-8 px-2" onClick={() => onView(row.purchaseId)}>
                      <Eye size={14} />
                    </Button>
                    <Button className="h-8 px-2" disabled={!canEdit} onClick={() => onEdit(row.purchaseId)}>
                      <Edit3 size={14} />
                    </Button>
                    <Button className="h-8 px-2" disabled={!isAdmin} onClick={() => onDelete(row.purchaseId)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-slate-500" colSpan={9}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GeneralItemsMasterPage({
  masterItems,
  canEdit,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
}: {
  masterItems: GeneralItemsMasterItem[];
  canEdit: boolean;
  isAdmin: boolean;
  onCreate: (payload: Omit<GeneralItemsMasterItem, 'id'>) => void;
  onUpdate: (id: string, payload: Omit<GeneralItemsMasterItem, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [itemName, setItemName] = useState('');
  const [defaultUnit, setDefaultUnit] = useState<Unit>('Pieces');
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const submit = () => {
    if (!itemName.trim()) return;
    const payload = {
      itemName: itemName.trim(),
      defaultUnit,
      isActive,
    };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onCreate(payload);
    }
    setItemName('');
    setDefaultUnit('Pieces');
    setIsActive(true);
    setEditingId(null);
  };

  const loadEdit = (item: GeneralItemsMasterItem) => {
    setEditingId(item.id);
    setItemName(item.itemName);
    setDefaultUnit(item.defaultUnit);
    setIsActive(item.isActive);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <Card className="grid gap-3 p-5 h-max">
        <h4 className="text-base font-bold text-slate-900">
          {editingId ? 'Edit General Item Master' : 'Add General Item Master'}
        </h4>
        <Field label="Item Name">
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Tea Glass"
          />
        </Field>
        <Field label="Default Unit">
          <select
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value as Unit)}
            disabled={!canEdit}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={!canEdit}
          />
          Active
        </label>
        <div className="flex gap-2">
          {editingId && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setEditingId(null);
                setItemName('');
                setDefaultUnit('Pieces');
                setIsActive(true);
              }}
            >
              Cancel
            </Button>
          )}
          <Button className="flex-1" variant="add" onClick={submit} disabled={!canEdit}>
            {editingId ? 'Update' : 'Save'}
          </Button>
        </div>
      </Card>

      <Card className="grid gap-3 p-5">
        <h4 className="text-base font-bold text-slate-900">General Items Master List</h4>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Item Name</th>
                <th className="px-3 py-2 text-left">Default Unit</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {masterItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">{item.itemName}</td>
                  <td className="px-3 py-2">{item.defaultUnit}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button className="h-8 px-2" disabled={!canEdit} onClick={() => loadEdit(item)}>
                        <Edit3 size={14} />
                      </Button>
                      <Button className="h-8 px-2" disabled={!isAdmin} onClick={() => onDelete(item.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {masterItems.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-500" colSpan={4}>
                    No master items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function GeneralItemsPage() {
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'purchase-entry' | 'purchase-register' | 'item-master' | 'supplier-rate-history' | 'stock-summary' | 'reports'>('purchase-entry');
  const [registerPage, setRegisterPage] = useState(1);
  const [registerPageSize] = useState(20);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<GeneralItemPurchase | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterSupplierName, setFilterSupplierName] = useState('');
  const [filterParticulars, setFilterParticulars] = useState('');
  const [filterBillNumber, setFilterBillNumber] = useState('');
  const [historySort, setHistorySort] = useState<'latest' | 'lowest' | 'highest'>('latest');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');

  const [form, setForm] = useState({
    purchaseDate: toDateInputValue(new Date()),
    billNumber: '',
    supplierName: '',
    notes: '',
    lineItems: [createLineItem()],
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedSupplierName = useDebounce(filterSupplierName, 300);
  const debouncedParticulars = useDebounce(filterParticulars, 300);
  const debouncedBillNumber = useDebounce(filterBillNumber, 300);
  const debouncedFromDate = useDebounce(fromDate, 300);
  const debouncedToDate = useDebounce(toDate, 300);
  const debouncedSupplierSearchTerm = useDebounce(supplierSearchTerm, 250);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const selectedLine = form.lineItems[selectedRowIndex] ?? form.lineItems[0];
  const rateLookupSupplier = useDebounce(form.supplierName.trim(), 300);
  const rateLookupParticulars = useDebounce(selectedLine?.particulars?.trim() ?? '', 300);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';
  const isAdmin = me?.role === 'admin';

  const sellersQuery = useQuery({
    queryKey: ['sellers-list-general-items', debouncedSupplierSearchTerm],
    enabled: activeTab === 'purchase-entry' || showNewSupplierModal,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: () =>
      api<{ items: SellerOption[]; total?: number }>(
        `${endpoints.sellers}?page=1&limit=75&q=${encodeURIComponent(
          debouncedSupplierSearchTerm.trim(),
        )}`,
      ),
  });

  const masterQuery = useQuery({
    queryKey: ['general-items-master'],
    enabled: activeTab === 'purchase-entry' || activeTab === 'item-master',
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: () =>
      api<{ items: GeneralItemsMasterItem[] }>(endpoints.generalItemsMaster).then(
        (res) => res.items ?? [],
      ),
  });

  const purchasesQuery = useQuery({
    queryKey: [
      'general-items-purchases',
      debouncedSearchQuery,
      debouncedSupplierName,
      debouncedParticulars,
      debouncedBillNumber,
      debouncedFromDate,
      debouncedToDate,
      registerPage,
      registerPageSize,
    ],
    enabled: ['purchase-register', 'purchase-entry', 'reports', 'supplier-rate-history'].includes(activeTab),
    staleTime: 60 * 1000,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(registerPage));
      params.set('limit', String(registerPageSize));
      if (debouncedSearchQuery.trim()) params.set('q', debouncedSearchQuery.trim());
      if (debouncedSupplierName.trim()) params.set('supplierName', debouncedSupplierName.trim());
      if (debouncedParticulars.trim()) params.set('particulars', debouncedParticulars.trim());
      if (debouncedBillNumber.trim()) params.set('billNumber', debouncedBillNumber.trim());
      if (debouncedFromDate.trim()) params.set('fromDate', debouncedFromDate.trim());
      if (debouncedToDate.trim()) params.set('toDate', debouncedToDate.trim());
      return api<{ items: GeneralItemPurchase[]; total: number; page: number; limit: number }>(
        `${endpoints.generalItems}?${params.toString()}`,
      ).then((res) => res);
    },
  });

  const stockSummaryQuery = useQuery({
    queryKey: ['general-items-stock-summary'],
    enabled: ['stock-summary', 'reports'].includes(activeTab),
    queryFn: () => api<StockSummaryRow[]>('/general-items/stock-summary'),
  });

  const rateHistoryQuery = useQuery({
    queryKey: ['general-items-rate-history', rateLookupSupplier, rateLookupParticulars],
    queryFn: () =>
      api<RateHistoryResponse>(
        `/general-items/rate-history?supplierName=${encodeURIComponent(rateLookupSupplier)}&particulars=${encodeURIComponent(rateLookupParticulars)}`,
      ),
    enabled: rateLookupSupplier.length > 0 && rateLookupParticulars.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const itemRateHistoryQuery = useQuery({
    queryKey: ['general-items-rate-history-all-suppliers', rateLookupParticulars],
    queryFn: () =>
      api<RateHistoryResponse>(
        `/general-items/rate-history?particulars=${encodeURIComponent(rateLookupParticulars)}`,
      ),
    enabled: rateLookupParticulars.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingId) {
        return api(`${endpoints.generalItems}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(endpoints.generalItems, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setForm({
        purchaseDate: toDateInputValue(new Date()),
        billNumber: '',
        supplierName: '',
        notes: '',
        lineItems: [createLineItem()],
      });
      setEditingId(null);
      setSelectedRowIndex(0);
      queryClient.invalidateQueries({ queryKey: ['general-items-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['general-items-stock-summary'] });
      showToast('General item purchase saved successfully.', 'success');
    },
    onError: (err: any) => showError(err),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.generalItems}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-items-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['general-items-stock-summary'] });
      showToast('General item purchase deleted.', 'success');
    },
    onError: (err: any) => showError(err),
  });

  const masterCreateMutation = useMutation({
    mutationFn: (payload: any) =>
      api(endpoints.generalItemsMaster, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-items-master'] });
      showToast('General item master created.', 'success');
    },
    onError: (err: any) => showError(err),
  });

  const masterUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api(`${endpoints.generalItemsMaster}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-items-master'] });
      showToast('General item master updated.', 'success');
    },
    onError: (err: any) => showError(err),
  });

  const masterDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.generalItemsMaster}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-items-master'] });
      showToast('General item master deleted.', 'success');
    },
    onError: (err: any) => showError(err),
  });

  const purchases = purchasesQuery.data?.items ?? [];
  const totalRegisterRecords = purchasesQuery.data?.total ?? 0;
  const totalRegisterPages = Math.max(1, Math.ceil(totalRegisterRecords / registerPageSize));
  const supplierOptions = useMemo(
    () => (sellersQuery.data?.items ?? []).map((s) => s.name),
    [sellersQuery.data],
  );
  const masterItems = masterQuery.data ?? [];
  const stockRows = stockSummaryQuery.data ?? [];
  const formTotalAmount = useMemo(
    () =>
      Number(
        form.lineItems
          .reduce((sum, item) => sum + Number(item.amount || 0), 0)
          .toFixed(2),
      ),
    [form.lineItems],
  );
  const isDirty = useMemo(
    () =>
      Boolean(
        editingId ||
        form.billNumber.trim() ||
        form.supplierName.trim() ||
        form.notes.trim() ||
        form.lineItems.some(
          (line) =>
            line.particulars.trim() ||
            Number(line.quantity) > 0 ||
            Number(line.ratePerUnit) > 0,
        ),
      ),
    [editingId, form],
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const flatRows = useMemo<FlatRow[]>(
    () =>
      purchases.flatMap((purchase) =>
        purchase.lineItems.map((lineItem) => ({
          purchaseId: purchase.id,
          purchaseDate: purchase.purchaseDate,
          billNumber: purchase.billNumber,
          supplierName: purchase.supplierName,
          notes: purchase.notes,
          totalAmount: purchase.totalAmount,
          particulars: lineItem.particulars,
          quantity: Number(lineItem.quantity),
          unit: lineItem.unit,
          ratePerUnit: Number(lineItem.ratePerUnit),
          amount: Number(lineItem.amount),
        })),
      ),
    [purchases],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const currentMonthTotal = purchases
      .filter((p) => {
        const date = new Date(p.purchaseDate);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    const suppliersCount = sellersQuery.data?.total ?? sellersQuery.data?.items?.length ?? 0;
    const uniqueItemsCount = masterItems.filter((item) => item.isActive).length;

    return {
      currentMonthTotal,
      suppliersCount,
      uniqueItemsCount,
    };
  }, [masterItems, purchases, sellersQuery.data]);

  const itemWiseReport = useMemo(() => {
    const grouped = new Map<string, { particulars: string; quantity: number; amount: number; unit: Unit }>();
    flatRows.forEach((row) => {
      const key = `${row.particulars}::${row.unit}`;
      const curr = grouped.get(key) ?? {
        particulars: row.particulars,
        quantity: 0,
        amount: 0,
        unit: row.unit,
      };
      curr.quantity += row.quantity;
      curr.amount += row.amount;
      grouped.set(key, curr);
    });
    return Array.from(grouped.values()).sort((a, b) => a.particulars.localeCompare(b.particulars));
  }, [flatRows]);

  const supplierWiseReport = useMemo(() => {
    const grouped = new Map<string, { supplierName: string; purchaseCount: number; totalAmount: number }>();
    purchases.forEach((purchase) => {
      const key = purchase.supplierName.trim();
      const curr = grouped.get(key) ?? {
        supplierName: key,
        purchaseCount: 0,
        totalAmount: 0,
      };
      curr.purchaseCount += 1;
      curr.totalAmount += purchase.totalAmount;
      grouped.set(key, curr);
    });
    return Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [purchases]);

  const monthlySummaryReport = useMemo(() => {
    const grouped = new Map<string, { month: string; totalAmount: number; purchaseCount: number }>();
    purchases.forEach((purchase) => {
      const date = new Date(purchase.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const curr = grouped.get(key) ?? { month: key, totalAmount: 0, purchaseCount: 0 };
      curr.totalAmount += purchase.totalAmount;
      curr.purchaseCount += 1;
      grouped.set(key, curr);
    });
    return Array.from(grouped.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [purchases]);

  const historyRows = useMemo(() => {
    const rows = itemRateHistoryQuery.data?.history ?? [];
    if (historySort === 'lowest') {
      return [...rows].sort((a, b) => a.ratePerUnit - b.ratePerUnit);
    }
    if (historySort === 'highest') {
      return [...rows].sort((a, b) => b.ratePerUnit - a.ratePerUnit);
    }
    return [...rows].sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
    );
  }, [historySort, itemRateHistoryQuery.data?.history]);

  const handleSavePurchase = () => {
    const payload = {
      purchaseDate: form.purchaseDate,
      billNumber: form.billNumber.trim(),
      supplierName: form.supplierName.trim(),
      notes: form.notes.trim(),
      lineItems: form.lineItems.map((lineItem) => ({
        particulars: lineItem.particulars.trim(),
        quantity: Number(lineItem.quantity),
        unit: lineItem.unit,
        ratePerUnit: Number(lineItem.ratePerUnit),
        amount: Number(lineItem.amount),
      })),
    };

    if (!payload.purchaseDate || !payload.supplierName) {
      showToast('Purchase Date and Supplier Name are required.', 'error');
      return;
    }

    const invalidLine = payload.lineItems.find(
      (lineItem) =>
        !lineItem.particulars ||
        !(lineItem.quantity > 0) ||
        !lineItem.unit ||
        !(lineItem.ratePerUnit > 0),
    );

    if (invalidLine) {
      showToast('Particulars, Quantity, Unit, and Rate Per Unit are required for each line item.', 'error');
      return;
    }

    saveMutation.mutate(payload);
  };

  const handleEdit = (purchaseId: string) => {
    const purchase = purchases.find((item) => item.id === purchaseId);
    if (!purchase) return;
    setEditingId(purchase.id);
    setForm({
      purchaseDate: toDateInputValue(purchase.purchaseDate),
      billNumber: purchase.billNumber || '',
      supplierName: purchase.supplierName,
      notes: purchase.notes || '',
      lineItems: purchase.lineItems.map((lineItem) => ({
        particulars: lineItem.particulars,
        quantity: Number(lineItem.quantity),
        unit: lineItem.unit,
        ratePerUnit: Number(lineItem.ratePerUnit),
        amount: Number(lineItem.amount),
      })),
    });
    setSelectedRowIndex(0);
    setActiveTab('purchase-entry');
    setViewingPurchase(null);
  };

  const handleDelete = async (purchaseId: string) => {
    const approved = await confirm({
      title: 'Delete General Item Purchase',
      message: 'Are you sure you want to delete this purchase record?',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!approved) return;
    deleteMutation.mutate(purchaseId);
  };

  const supplierCreateMutation = useMutation({
    mutationFn: (payload: { name: string; contactPerson?: string; phone?: string }) =>
      api<{ id: string; name: string }>(endpoints.sellers, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: async (supplier) => {
      await queryClient.invalidateQueries({ queryKey: ['sellers-list-general-items'] });
      setForm((prev) => ({ ...prev, supplierName: supplier.name }));
      setShowNewSupplierModal(false);
      showToast(`Supplier "${supplier.name}" added successfully.`, 'success');
    },
    onError: (err: any) => showError(err),
  });

  const changeTab = async (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    if (isDirty && activeTab === 'purchase-entry') {
      const approved = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes in Purchase Entry. Continue without saving?',
        confirmLabel: 'Continue',
        variant: 'primary',
      });
      if (!approved) return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="grid gap-6">
      <Card className="p-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            type="button"
            className={activeTab === 'purchase-entry' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
            onClick={() => void changeTab('purchase-entry')}
          >
            Purchase Entry
          </Button>
          <Button
            type="button"
            className={activeTab === 'purchase-register' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
            onClick={() => void changeTab('purchase-register')}
          >
            Purchase Register
          </Button>
          <Button
            type="button"
            className={activeTab === 'item-master' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
            onClick={() => void changeTab('item-master')}
          >
            Item Master
          </Button>
          <Button
            type="button"
            className={activeTab === 'supplier-rate-history' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
            onClick={() => void changeTab('supplier-rate-history')}
          >
            Supplier Rate History
          </Button>
          <Button
            type="button"
            className={activeTab === 'stock-summary' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
            onClick={() => void changeTab('stock-summary')}
          >
            Stock Summary
          </Button>
          <Button
            type="button"
            className={activeTab === 'reports' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
            onClick={() => void changeTab('reports')}
          >
            Reports
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">Total Purchases This Month</p>
          <p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(summary.currentMonthTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Number of Suppliers</p>
          <p className="mt-2 text-xl font-bold">{summary.suppliersCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Number of Items Purchased</p>
          <p className="mt-2 text-xl font-bold">{summary.uniqueItemsCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Latest Price Trends</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {rateHistoryQuery.data?.stats?.lastRate
              ? `Last: ${formatCurrency(rateHistoryQuery.data.stats.lastRate)}`
              : 'Select Supplier + Item'}
          </p>
        </Card>
      </div>

      {activeTab === 'purchase-entry' && (
        <div className="grid gap-6">
          <GeneralItemsForm
            form={form}
            setForm={setForm}
            onSubmit={handleSavePurchase}
            onCancel={() => {
              setEditingId(null);
              setForm({
                purchaseDate: toDateInputValue(new Date()),
                billNumber: '',
                supplierName: '',
                notes: '',
                lineItems: [createLineItem()],
              });
            }}
            isEditing={Boolean(editingId)}
            isSaving={saveMutation.isPending}
            canEdit={canEdit}
            supplierOptions={supplierOptions}
            onOpenSupplierModal={() => setShowNewSupplierModal(true)}
            onSupplierSearchTermChange={setSupplierSearchTerm}
            masterItems={masterItems}
            selectedRowIndex={selectedRowIndex}
            setSelectedRowIndex={setSelectedRowIndex}
            rateComparison={
              <RateComparisonCard
                stats={rateHistoryQuery.data?.stats ?? null}
                currentRate={Number(selectedLine?.ratePerUnit || 0)}
                totalPurchaseAmount={formTotalAmount}
              />
            }
          />

        </div>
      )}

      {activeTab === 'purchase-register' && (
        <div className="grid gap-6">
          <Card className="grid gap-3 p-5">
            <h4 className="text-sm font-bold text-slate-800">Filters and Search</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search"
              />
              <Input
                value={filterSupplierName}
                onChange={(e) => setFilterSupplierName(e.target.value)}
                placeholder="Supplier Name"
              />
              <Input
                value={filterParticulars}
                onChange={(e) => setFilterParticulars(e.target.value)}
                placeholder="Particulars"
              />
              <Input
                value={filterBillNumber}
                onChange={(e) => setFilterBillNumber(e.target.value)}
                placeholder="Bill Number"
              />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </Card>

          <GeneralItemsTable
            rows={flatRows}
            canEdit={canEdit}
            isAdmin={isAdmin}
            onView={(purchaseId) => {
              const purchase = purchases.find((item) => item.id === purchaseId);
              if (!purchase) return;
              setViewingPurchase(purchase);
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              Page {registerPage} of {totalRegisterPages} • {totalRegisterRecords} records
            </p>
            <div className="flex gap-2">
              <Button className="h-8 px-2" variant="secondary" disabled={registerPage <= 1} onClick={() => setRegisterPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button className="h-8 px-2" variant="secondary" disabled={registerPage >= totalRegisterPages} onClick={() => setRegisterPage((p) => Math.min(totalRegisterPages, p + 1))}>Next</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'supplier-rate-history' && (
        <div className="grid gap-6">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">Supplier Rate History</h4>
              <select
                value={historySort}
                onChange={(e) =>
                  setHistorySort(e.target.value as 'latest' | 'lowest' | 'highest')
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
              >
                <option value="latest">Latest Purchase</option>
                <option value="lowest">Lowest Price</option>
                <option value="highest">Highest Price</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[880px] w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Purchase Date</th>
                    <th className="px-3 py-2 text-left">Supplier Name</th>
                    <th className="px-3 py-2 text-left">Bill Number</th>
                    <th className="px-3 py-2 text-left">Quantity</th>
                    <th className="px-3 py-2 text-left">Rate Per Unit</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyRows.map((row, index) => (
                    <tr key={`${row.purchaseDate}-${row.supplierName}-${index}`}>
                      <td className="px-3 py-2">{new Date(row.purchaseDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-2">{row.supplierName}</td>
                      <td className="px-3 py-2">{row.billNumber || 'N/A'}</td>
                      <td className="px-3 py-2">{row.quantity} {row.unit}</td>
                      <td className="px-3 py-2">{formatCurrency(row.ratePerUnit)}</td>
                      <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-slate-500" colSpan={6}>
                        Select an item in the form to view rate history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'stock-summary' && (
        <div className="grid gap-6">
          <StockSummaryCard stockRows={stockRows} />
        </div>
      )}

      {activeTab === 'item-master' && (
        <GeneralItemsMasterPage
          masterItems={masterItems}
          canEdit={canEdit}
          isAdmin={isAdmin}
          onCreate={(payload) => masterCreateMutation.mutate(payload)}
          onUpdate={(id, payload) => masterUpdateMutation.mutate({ id, payload })}
          onDelete={async (id) => {
            const approved = await confirm({
              title: 'Delete General Item Master',
              message: 'Are you sure you want to delete this master item?',
              variant: 'danger',
              confirmLabel: 'Delete',
            });
            if (approved) masterDeleteMutation.mutate(id);
          }}
        />
      )}

      {activeTab === 'reports' && (
        <div className="grid gap-5">
          <Card className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const rows = [
                  ['Particulars', 'Unit', 'Total Quantity', 'Total Amount'],
                  ...itemWiseReport.map((row) => [
                    row.particulars,
                    row.unit,
                    String(row.quantity),
                    String(row.amount.toFixed(2)),
                  ]),
                ];
                downloadCsv('item-wise-purchase-report.csv', rows);
              }}
            >
              Export Excel (CSV)
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={14} />
              Export PDF
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={14} />
              Print
            </Button>
          </Card>

          <Card className="grid gap-3">
            <h4 className="text-sm font-bold text-slate-800">Item Wise Purchase Report</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Particulars</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Total Quantity</th>
                    <th className="px-3 py-2 text-left">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemWiseReport.map((row) => (
                    <tr key={`${row.particulars}-${row.unit}`}>
                      <td className="px-3 py-2">{row.particulars}</td>
                      <td className="px-3 py-2">{row.unit}</td>
                      <td className="px-3 py-2">{row.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="grid gap-3">
            <h4 className="text-sm font-bold text-slate-800">Supplier Wise Purchase Report</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[600px] w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Supplier Name</th>
                    <th className="px-3 py-2 text-left">Purchase Count</th>
                    <th className="px-3 py-2 text-left">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierWiseReport.map((row) => (
                    <tr key={row.supplierName}>
                      <td className="px-3 py-2">{row.supplierName}</td>
                      <td className="px-3 py-2">{row.purchaseCount}</td>
                      <td className="px-3 py-2">{formatCurrency(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="grid gap-3">
            <h4 className="text-sm font-bold text-slate-800">Rate Comparison Report</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[920px] w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Particulars</th>
                    <th className="px-3 py-2 text-left">Supplier</th>
                    <th className="px-3 py-2 text-left">Latest Rate</th>
                    <th className="px-3 py-2 text-left">Lowest Rate</th>
                    <th className="px-3 py-2 text-left">Highest Rate</th>
                    <th className="px-3 py-2 text-left">Average Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(
                    flatRows.reduce((map, row) => {
                      const key = `${row.particulars}::${row.supplierName}`;
                      const current = map.get(key) ?? {
                        particulars: row.particulars,
                        supplierName: row.supplierName,
                        latestDate: row.purchaseDate,
                        latestRate: row.ratePerUnit,
                        minRate: row.ratePerUnit,
                        maxRate: row.ratePerUnit,
                        sumRate: 0,
                        count: 0,
                      };
                      if (
                        new Date(row.purchaseDate).getTime() >
                        new Date(current.latestDate).getTime()
                      ) {
                        current.latestDate = row.purchaseDate;
                        current.latestRate = row.ratePerUnit;
                      }
                      current.minRate = Math.min(current.minRate, row.ratePerUnit);
                      current.maxRate = Math.max(current.maxRate, row.ratePerUnit);
                      current.sumRate += row.ratePerUnit;
                      current.count += 1;
                      map.set(key, current);
                      return map;
                    }, new Map<string, any>()),
                  )
                    .map(([, value]) => value)
                    .sort((a, b) => a.particulars.localeCompare(b.particulars))
                    .map((row) => (
                      <tr key={`${row.particulars}-${row.supplierName}`}>
                        <td className="px-3 py-2">{row.particulars}</td>
                        <td className="px-3 py-2">{row.supplierName}</td>
                        <td className="px-3 py-2">{formatCurrency(row.latestRate)}</td>
                        <td className="px-3 py-2">{formatCurrency(row.minRate)}</td>
                        <td className="px-3 py-2">{formatCurrency(row.maxRate)}</td>
                        <td className="px-3 py-2">
                          {formatCurrency(row.sumRate / Math.max(row.count, 1))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="grid gap-3">
            <h4 className="text-sm font-bold text-slate-800">Monthly Purchase Summary</h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-[620px] w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Month</th>
                    <th className="px-3 py-2 text-left">Purchase Count</th>
                    <th className="px-3 py-2 text-left">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlySummaryReport.map((row) => (
                    <tr key={row.month}>
                      <td className="px-3 py-2">{row.month}</td>
                      <td className="px-3 py-2">{row.purchaseCount}</td>
                      <td className="px-3 py-2">{formatCurrency(row.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <StockSummaryCard stockRows={stockRows} />
        </div>
      )}

      {viewingPurchase && (
        <GeneralItemsViewDialog
          purchase={viewingPurchase}
          onClose={() => setViewingPurchase(null)}
          onEdit={() => handleEdit(viewingPurchase.id)}
        />
      )}

      <NewSupplierModal
        open={showNewSupplierModal}
        canEdit={canEdit}
        isSaving={supplierCreateMutation.isPending}
        onClose={() => setShowNewSupplierModal(false)}
        onSave={(payload) => {
          const trimmedName = payload.name.trim();
          const normalizedPhone = (payload.phone ?? '').replace(/\D/g, '');
          if (trimmedName.length < 2) {
            showToast('Supplier Name must be at least 2 characters.', 'error');
            return;
          }
          if (normalizedPhone && normalizedPhone.length !== 10) {
            showToast('Mobile Number must be exactly 10 digits.', 'error');
            return;
          }
          supplierCreateMutation.mutate({
            name: trimmedName,
            ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          });
        }}
      />
    </div>
  );
}
