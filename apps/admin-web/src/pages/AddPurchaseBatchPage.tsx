import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Save,
  Search,
  Calendar,
  User,
  FileText,
  ShoppingBag,
  Edit3,
  Trash2,
  Check,
  Coffee,
  ClipboardList,
  Eye,
} from 'lucide-react';
import { Button, Card, Input, Field } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { formatCurrency, generateBatchCode } from '@amaravathi/shared-utils';
import { ViewDetailsModal } from '../components/ViewDetailsModal';
import { useNotification } from '../components/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../hooks/useDebounce';
import type {
  PurchaseBatch,
  PurchaseBatchInput,
  PurchaseBatchItemInput,
} from '@amaravathi/shared-types';
import { purchaseBatchSchema as purchaseBatchZodSchema } from '@amaravathi/shared-types';
import { TeaPowderTypesPage } from './Modules';

const initialFormState = {
  purchaseDate: new Date(),
  numberOfBags: 30,
  billNumber: '',
  sellerId: '',
  sellerName: '',
  lineItems: [{ teaPowderTypeId: '', teaPowderTypeName: '', quantityKg: 0, pricePerKg: 0, totalAmount: 0 }],
};

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  hasError?: boolean;
  onCreateNew?: (val: string) => void;
  createLabel?: string;
  className?: string;
  required?: boolean;
}

function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  hasError,
  onCreateNew,
  createLabel,
  className,
  required,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = options
    .filter((opt) => opt.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 8);

  const hasExactMatch = options.some(
    (opt) => opt.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <div className="relative">
      <Input
        className={`h-10 text-sm font-normal transition-colors ${className || ''} ${
          hasError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50/10'
            : 'border-slate-200'
        }`}
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          onChange(val);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        placeholder={placeholder}
        required={required}
      />
      {isOpen &&
        (filtered.length > 0 ||
          (search.trim() !== '' && !hasExactMatch && onCreateNew)) && (
          <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
            {filtered.map((opt, i) => (
              <li
                key={i}
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                className="relative cursor-pointer select-none rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              >
                {opt}
              </li>
            ))}
            {search.trim() !== '' && !hasExactMatch && onCreateNew && (
              <li
                onMouseDown={() => {
                  onCreateNew(search.trim());
                  setIsOpen(false);
                }}
                className="relative cursor-pointer select-none rounded-md px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 transition-colors border-t border-slate-100"
              >
                Add "{search}" as new {createLabel || 'Tea Powder Type'}
              </li>
            )}
          </ul>
        )}
    </div>
  );
}

export function AddPurchaseBatchPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] =
    useState<Partial<PurchaseBatchInput>>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const activeTab = searchParams.get('tab') === 'types' ? 'types' : 'batches';
  const setActiveTab = (tab: 'batches' | 'types') => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'batches') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', 'types');
    }
    setSearchParams(newParams);
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBatches, setExpandedBatches] = useState<
    Record<string, boolean>
  >({});
  const [batchCodePreview, setBatchCodePreview] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<any | null>(null);

  // Tracks which line items are currently in Edit Mode. Brand new batch form starts with first row in Edit Mode.
  const [editingRowIndices, setEditingRowIndices] = useState<
    Record<number, boolean>
  >({ 0: true });

  // Fetch session permissions
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  // Fetch batches query
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches', debouncedSearchQuery],
    queryFn: () =>
      api<{ items: PurchaseBatch[] }>(
        `${endpoints.batches}?q=${encodeURIComponent(debouncedSearchQuery)}`,
      ).then((res) => res.items),
  });

  // Fetch Tea Powder Types for autocomplete option matching
  const { data: teaPowderTypes = [] } = useQuery({
    queryKey: ['teaPowderTypes'],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(endpoints.teaPowderTypes).then(
        (res) => res.items ?? [],
      ),
  });

  // Unique merged list of active tea powder grade/category taxonomies
  const autocompleteOptions = Array.from(
    new Set(teaPowderTypes.map((c) => c.name.trim())),
  ).filter(Boolean);
  const teaPowderTypeByName = new Map(
    teaPowderTypes.map((item) => [item.name.trim().toLowerCase(), item.name]),
  );

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: (data: PurchaseBatchInput) => {
      if (editingId) {
        return api(`${endpoints.batches}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return api(endpoints.batches, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      const wasEditing = Boolean(editingId);
      setFormData(initialFormState);
      setEditingId(null);
      setShowForm(false);
      setEditingRowIndices({ 0: true });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      showToast(
        wasEditing
          ? t('addPurchaseBatch.messages.updatedSuccess')
          : t('addPurchaseBatch.messages.savedSuccess'),
        'success',
      );
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`${endpoints.batches}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      showToast(t('addPurchaseBatch.messages.deletedSuccess'), 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  // Inline Master Creation Mutation for brand new Tea Powder Types
  const createPowderTypeMutation = useMutation({
    mutationFn: (name: string) =>
      api<{ id: string; name: string }>(endpoints.teaPowderTypes, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaPowderTypes'] });
      showToast(t('addPurchaseBatch.messages.newTypeCreated'), 'success');
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  // Fetch Sellers for autocomplete option matching
  const { data: sellersData } = useQuery({
    queryKey: ['all-sellers-list'],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(endpoints.sellers).then(
        (res) => res.items ?? [],
      ),
  });
  const sellerOptions = (sellersData ?? []).map((s) => s.name);
  const sellerByName = new Map(
    (sellersData ?? []).map((s) => [s.name.trim().toLowerCase(), s]),
  );

  // Inline Master Creation Mutation for brand new Sellers
  const createSellerMutation = useMutation({
    mutationFn: (name: string) =>
      api<{ id: string; name: string }>(endpoints.sellers, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: (newSeller) => {
      setFormData((prev) => ({
        ...prev,
        sellerId: newSeller.id,
        sellerName: newSeller.name,
      }));
      queryClient.invalidateQueries({ queryKey: ['all-sellers-list'] });
      showToast(
        t('addPurchaseBatch.messages.supplierAdded').replace(
          '{{name}}',
          newSeller.name,
        ),
        'success',
      );
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  // Generate Batch Code Preview
  useEffect(() => {
    try {
      if (formData.numberOfBags && formData.purchaseDate) {
        const code = generateBatchCode(
          formData.numberOfBags,
          formData.purchaseDate,
        );
        setBatchCodePreview(code);
      } else {
        setBatchCodePreview('');
      }
    } catch {
      setBatchCodePreview('');
    }
  }, [formData.numberOfBags, formData.purchaseDate]);

  // Edit batch: Load into form, set all loaded line items to view mode, and scroll up smoothly
  const handleEdit = (batch: PurchaseBatch) => {
    setEditingId(batch.id);
    setFormData({
      purchaseDate: new Date(batch.purchaseDate),
      numberOfBags: batch.numberOfBags,
      billNumber: batch.billNumber,
      sellerName: batch.sellerName,
      sellerId: batch.sellerId,
      lineItems: batch.lineItems.map((item) => ({
        teaPowderTypeId: item.teaPowderTypeId,
        teaPowderTypeName: item.teaPowderTypeName,
        quantityKg: item.quantityKg,
        pricePerKg: item.pricePerKg,
        totalAmount: item.totalAmount,
      })),
    });
    // Set all loaded items to view mode by default
    const rowStates: Record<number, boolean> = {};
    batch.lineItems.forEach((_, index) => {
      rowStates[index] = false;
    });
    setEditingRowIndices(rowStates);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete batch
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: t('addPurchaseBatch.messages.deleteConfirmTitle'),
      message: t('addPurchaseBatch.messages.deleteConfirmMsg'),
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  // Cancel edit
  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
    setEditingRowIndices({ 0: true });
  };

  // Toggle form
  const handleToggleNewForm = () => {
    if (showForm) {
      setFormData(initialFormState);
      setEditingId(null);
      setShowForm(false);
      setEditingRowIndices({ 0: true });
    } else {
      setFormData(initialFormState);
      setEditingId(null);
      setShowForm(true);
      setEditingRowIndices({ 0: true });
    }
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, boolean> = {};
    if (!formData.purchaseDate) errors.purchaseDate = true;
    if (!formData.numberOfBags || formData.numberOfBags <= 0)
      errors.numberOfBags = true;
    if (!formData.billNumber?.trim()) errors.billNumber = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast(t('addPurchaseBatch.messages.fillRequired'), 'error');
      setTimeout(() => {
        const firstInvalidField = document.querySelector(
          '.border-rose-500, input.border-rose-500',
        );
        if (firstInvalidField) {
          firstInvalidField.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 50);
      return;
    }
    setFormErrors({});

    if (!formData.lineItems || formData.lineItems.length === 0) {
      showToast(t('addPurchaseBatch.messages.atLeastOneItem'), 'error');
      return;
    }

    // Verify unique tea powder types
    const itemNames = formData.lineItems.map((item) =>
      item.teaPowderTypeId.trim().toLowerCase(),
    );
    const duplicates = itemNames.filter(
      (name, i) => itemNames.indexOf(name) !== i && name !== '',
    );
    if (duplicates.length > 0) {
      showToast(
        t('addPurchaseBatch.messages.duplicateNotAllowed').replace(
          '{{duplicate}}',
          duplicates[0] ?? '',
        ),
        'error',
      );
      return;
    }

    for (const item of formData.lineItems) {
      if (!item.teaPowderTypeId?.trim() || !item.teaPowderTypeName?.trim()) {
        showToast(t('addPurchaseBatch.messages.typeRequired'), 'error');
        return;
      }
      if (item.quantityKg === undefined || item.quantityKg <= 0) {
        showToast(t('addPurchaseBatch.messages.quantityGreaterThanZero'), 'error');
        return;
      }
      if (item.pricePerKg === undefined || item.pricePerKg <= 0) {
        showToast(t('addPurchaseBatch.messages.priceGreaterThanZero'), 'error');
        return;
      }
      if (item.pricePerKg > 100000) {
        showToast(t('addPurchaseBatch.messages.priceLimit'), 'error');
        return;
      }
    }

    const payload: PurchaseBatchInput = {
      purchaseDate: formData.purchaseDate as Date,
      numberOfBags: Number(formData.numberOfBags),
      billNumber: String(formData.billNumber ?? '').trim(),
      sellerId: String(formData.sellerId ?? '').trim() || undefined,
      sellerName: String(formData.sellerName ?? '').trim() || undefined,
      batchCode: batchCodePreview,
      lineItems: formData.lineItems.map((item) => ({
        teaPowderTypeId: item.teaPowderTypeId,
        teaPowderTypeName: item.teaPowderTypeName,
        quantityKg: Number(item.quantityKg),
        pricePerKg: Number(item.pricePerKg),
        totalAmount: Number((Number(item.quantityKg) * Number(item.pricePerKg)).toFixed(2)),
      })),
      totalQuantityKg: Number(
        formData.lineItems
          .reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
          .toFixed(3),
      ),
      totalBatchAmount: Number(
        formData.lineItems
          .reduce((sum, item) => sum + Number(item.quantityKg || 0) * Number(item.pricePerKg || 0), 0)
          .toFixed(2),
      ),
    };

    const parsed = purchaseBatchZodSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = issue?.path?.[0];
      setFormErrors({
        purchaseDate: key === 'purchaseDate',
        numberOfBags: key === 'numberOfBags',
        billNumber: key === 'billNumber',
      });
      showToast(issue?.message || 'Validation failed', 'error');
      return;
    }

    saveMutation.mutate(parsed.data);
  };

  // Dynamic Item handlers
  const addItem = () => {
    const newIndex = formData.lineItems!.length;
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...(prev.lineItems || []),
        { teaPowderTypeId: '', teaPowderTypeName: '', quantityKg: 0, pricePerKg: 0, totalAmount: 0 },
      ],
    }));
    setEditingRowIndices((prev) => ({ ...prev, [newIndex]: true }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter((_, i) => i !== index),
    }));
    // Shift index entries in row editing state
    setEditingRowIndices((prev) => {
      const copy = { ...prev };
      delete copy[index];
      const updated: Record<number, boolean> = {};
      Object.keys(copy).forEach((k) => {
        const numKey = Number(k);
        if (numKey > index) {
          updated[numKey - 1] = copy[numKey] ?? false;
        } else {
          updated[numKey] = copy[numKey] ?? false;
        }
      });
      return updated;
    });
  };

  const updateItem = (
    index: number,
    field: keyof PurchaseBatchItemInput,
    value: string | number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: (prev.lineItems || []).map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
              totalAmount: Number(
                (
                  (field === 'quantityKg' ? Number(value) : Number(item.quantityKg || 0)) *
                  (field === 'pricePerKg' ? Number(value) : Number(item.pricePerKg || 0))
                ).toFixed(2),
              ),
            }
          : item,
      ),
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedBatches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Pagination Math
  const itemsPerPage = 10;
  const totalPages = Math.ceil(batches.length / itemsPerPage);
  const paginatedBatches = batches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Check if any row is currently in Edit Mode
  const hasAnyActiveEditRow = Object.values(editingRowIndices).some(
    (val) => val === true,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Buttons Container */}
      <div className="flex flex-wrap rounded-xl border border-slate-200 p-1 bg-white shadow-sm font-semibold text-slate-600 no-print">
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all ${
            activeTab === 'batches'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={16} />
          <span>{t('addPurchaseBatch.tabs.purchaseBatches')}</span>
        </button>
        <button
          onClick={() => setActiveTab('types')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all ${
            activeTab === 'types'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Coffee size={16} />
          <span>{t('addPurchaseBatch.tabs.teaPowderTypes')}</span>
        </button>
      </div>

      <div className="min-w-0">
        {activeTab === 'types' ? (
          <TeaPowderTypesPage />
        ) : (
          <div className="grid gap-8">
            {/* 2. Purchase Batch Entry Form */}
            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="grid gap-6 animate-in fade-in duration-300"
              >
                <Card className="flex flex-col gap-6 p-6 rounded-2xl shadow-sm border border-slate-200 bg-white">
                  {/* Close Button is natively placed inside the New Purchase Batch Form corner */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {editingId
                          ? t('addPurchaseBatch.form.modifyBatch')
                          : t('addPurchaseBatch.form.newBatch')}
                      </h3>
                      {editingId && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          {t('addPurchaseBatch.form.editingMode')}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none"
                      title={t('addPurchaseBatch.form.dismissForm')}
                    >
                      <svg
                        className="h-4.5 w-4.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                    <Field label={t('addPurchaseBatch.form.purchaseDate')}>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          size={18}
                        />
                        <Input
                          className={`h-10 text-sm font-normal pl-10 pr-3 ${
                            formErrors.purchaseDate
                              ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                              : 'border-slate-200'
                          }`}
                          type="date"
                          value={
                            formData.purchaseDate instanceof Date
                              ? formData.purchaseDate
                                  .toISOString()
                                  .split('T')[0]
                              : String(formData.purchaseDate || '').split(
                                  'T',
                                )[0]
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setFormData({
                                ...formData,
                                purchaseDate: new Date(val),
                              });
                            }
                          }}
                          required
                        />
                      </div>
                    </Field>

                    <Field label={t('addPurchaseBatch.form.noOfBags')}>
                      <div className="relative">
                        <ShoppingBag
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          size={18}
                        />
                        <Input
                          className={`h-10 text-sm font-normal pl-10 ${
                            formErrors.numberOfBags
                              ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                              : 'border-slate-200'
                          }`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={
                            formData.numberOfBags
                              ? String(Number(formData.numberOfBags))
                              : ''
                          }
                          onKeyDown={(e) => {
                            // Allow backspace, delete, tab, escape, enter
                            if (
                              [46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
                              // Allow Ctrl+A, Ctrl+C, Ctrl+V, Cmd+A
                              e.ctrlKey === true ||
                              e.metaKey === true ||
                              // Allow arrows
                              (e.keyCode >= 35 && e.keyCode <= 40)
                            ) {
                              return;
                            }
                            // Stop keyboard input if not a digit
                            if (
                              (e.shiftKey ||
                                e.keyCode < 48 ||
                                e.keyCode > 57) &&
                              (e.keyCode < 96 || e.keyCode > 105)
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const cleanVal = e.target.value.replace(
                              /[^0-9]/g,
                              '',
                            );
                            const parsed = parseInt(cleanVal, 10);
                            setFormData({
                              ...formData,
                              numberOfBags: isNaN(parsed) ? 0 : parsed,
                            });
                          }}
                          required
                        />
                      </div>
                    </Field>

                    <Field label={t('addPurchaseBatch.form.billNumber')}>
                      <div className="relative">
                        <FileText
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          size={18}
                        />
                        <Input
                          className={`h-10 text-sm font-normal pl-10 ${
                            formErrors.billNumber
                              ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                              : 'border-slate-200'
                          }`}
                          value={formData.billNumber || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              billNumber: e.target.value,
                            })
                          }
                          placeholder="INV-001"
                          required
                        />
                      </div>
                    </Field>

                    <div className="md:col-span-2">
                      <Field label={t('addPurchaseBatch.form.sellerName')}>
                        <div className="relative">
                          <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
                            size={18}
                          />
                          <AutocompleteInput
                            className="pl-10"
                            value={formData.sellerName || ''}
                            onChange={(val) => {
                              const seller = sellerByName.get(
                                val.trim().toLowerCase(),
                              );
                              setFormData({
                                ...formData,
                                sellerName: val,
                                sellerId: seller?.id ?? '',
                              });
                            }}
                            options={sellerOptions}
                            placeholder={t(
                              'addPurchaseBatch.form.selectSeller',
                            )}
                            onCreateNew={(val) =>
                              createSellerMutation.mutate(val)
                            }
                            createLabel="Seller"
                            hasError={false}
                            required={false}
                          />
                        </div>
                      </Field>
                    </div>

                    <Field label={t('addPurchaseBatch.form.batchCode')}>
                      <Input
                        className={`h-10 text-sm font-normal border-slate-200 cursor-not-allowed uppercase tracking-wider ${
                          batchCodePreview
                            ? 'text-slate-700 bg-slate-50'
                            : 'text-slate-400 bg-slate-50'
                        }`}
                        value={
                          batchCodePreview ||
                          t('addPurchaseBatch.form.batchCodePreview')
                        }
                        disabled
                      />
                    </Field>
                  </div>
                </Card>

                {/* 3. Tea Powder Line Items */}
                <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white p-0">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {t('addPurchaseBatch.form.lineItemsTitle')}
                    </h3>
                  </div>

                  <div className="p-6 flex flex-col gap-4">
                    {/* Header row for desktop - perfect tabular alignment, hidden on mobile */}
                    <div className="hidden sm:grid grid-cols-[44px_1fr_140px_160px_160px_136px] gap-4 px-4 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      <div className="text-center">#</div>
                      <div>{t('addPurchaseBatch.table.teaPowderType')}</div>
                      <div>{t('addPurchaseBatch.table.quantityKg')}</div>
                      <div>{t('addPurchaseBatch.table.pricePerKg')}</div>
                      <div>{t('addPurchaseBatch.table.totalAmount')}</div>
                      <div className="text-center">
                        {t('addPurchaseBatch.table.actions')}
                      </div>
                    </div>

                    {/* Simple unified table rows with minimal padding and standard fonts. Removed overflow-hidden to prevent clipping dropdowns */}
                    <div className="grid divide-y divide-slate-100 border border-slate-200/60 rounded-xl bg-white relative z-20">
                      {formData.lineItems?.map((item, index) => {
                        const isDuplicate = formData.lineItems!.some(
                          (other, i) =>
                            i !== index &&
                            other.teaPowderTypeId.trim().toLowerCase() ===
                              item.teaPowderTypeId.trim().toLowerCase() &&
                            item.teaPowderTypeId.trim() !== '',
                        );

                        // Row-level Edit mode check
                        const isEditingRow = !!editingRowIndices[index];

                        // Row is valid only when all required fields are filled and there are no duplicates
                        const isRowValid =
                          item.teaPowderTypeId?.trim() !== '' &&
                          item.quantityKg !== undefined &&
                          item.quantityKg > 0 &&
                          item.pricePerKg !== undefined &&
                          item.pricePerKg > 0 &&
                          !isDuplicate;

                        // ➕ Add button appears ONLY on the very last view-mode row of the saved line items, and only if there's no editing row anywhere
                        const showAddButton =
                          index === formData.lineItems!.length - 1 &&
                          !isEditingRow &&
                          !hasAnyActiveEditRow;

                        return (
                          <div
                            key={index}
                            className={`grid grid-cols-1 sm:grid-cols-[44px_1fr_140px_160px_160px_136px] gap-4 items-center py-2.5 px-4 transition-all relative ${
                              isDuplicate
                                ? 'bg-red-50/20 z-10'
                                : isEditingRow
                                  ? 'bg-slate-50/30 z-30'
                                  : 'hover:bg-slate-50/20 z-10'
                            }`}
                          >
                            {/* Index Column */}
                            <div className="text-sm font-normal text-slate-400 text-center mx-auto sm:mx-0">
                              {index + 1}
                            </div>

                            {/* Tea Powder Type Field (Dynamic input or standard font text) */}
                            <div className="flex flex-col gap-1">
                              <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {t('addPurchaseBatch.table.teaPowderType')}
                              </span>
                              {isEditingRow ? (
                                <AutocompleteInput
                                  value={item.teaPowderTypeName}
                                  onChange={(val) => {
                                    const normalized = val.trim().toLowerCase();
                                    const matched = teaPowderTypes.find(
                                      (type) =>
                                        type.name.trim().toLowerCase() ===
                                        normalized,
                                    );
                                    updateItem(index, 'teaPowderTypeName', val);
                                    updateItem(
                                      index,
                                      'teaPowderTypeId',
                                      matched?.id ?? '',
                                    );
                                  }}
                                  options={autocompleteOptions}
                                  placeholder={t(
                                    'addPurchaseBatch.table.selectGrade',
                                  )}
                                  hasError={isDuplicate}
                                  onCreateNew={(newVal) => {
                                    createPowderTypeMutation.mutate(newVal, {
                                      onSuccess: (newType) => {
                                        updateItem(index, 'teaPowderTypeName', newType.name);
                                        updateItem(index, 'teaPowderTypeId', newType.id);
                                      },
                                    });
                                  }}
                                />
                              ) : (
                                <div className="text-sm font-normal text-slate-700 select-none truncate">
                                  {item.teaPowderTypeName || (
                                    <span className="text-slate-400 italic">
                                      {t('addPurchaseBatch.table.emptyType')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {isDuplicate && (
                                <span className="text-[10px] font-medium text-red-600 mt-0.5 block">
                                  {t('addPurchaseBatch.table.duplicateType')}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {t('addPurchaseBatch.table.quantityKg')}
                              </span>
                              {isEditingRow ? (
                                <Input
                                  className="h-10 text-sm font-normal"
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={item.quantityKg || ''}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      'quantityKg',
                                      e.target.value === '' ? 0 : Number(e.target.value),
                                    )
                                  }
                                  required
                                />
                              ) : (
                                <div className="text-sm font-normal text-slate-700 select-none">
                                  {Number(item.quantityKg || 0).toFixed(3)}
                                </div>
                              )}
                            </div>

                            {/* Price per Kg (Dynamic input or standard font text) */}
                            <div className="flex flex-col gap-1">
                              <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {t('addPurchaseBatch.table.pricePerKg')}
                              </span>
                              {isEditingRow ? (
                                <Input
                                  className="h-10 text-sm font-normal"
                                  type="number"
                                  min="0.01"
                                  max="100000"
                                  step="0.01"
                                  value={item.pricePerKg || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const numVal = val === '' ? 0 : Number(val);
                                    if (numVal <= 100000) {
                                      updateItem(index, 'pricePerKg', numVal);
                                    } else {
                                      updateItem(index, 'pricePerKg', 100000);
                                    }
                                  }}
                                  required
                                />
                              ) : (
                                <div className="text-sm font-normal text-slate-700 select-none">
                                  {formatCurrency(item.pricePerKg)}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {t('addPurchaseBatch.table.totalAmount')}
                              </span>
                              <div className="text-sm font-semibold text-slate-700 select-none">
                                {formatCurrency(item.totalAmount || 0)}
                              </div>
                            </div>

                            {/* Row Actions */}
                            <div className="flex flex-col gap-1 sm:items-center">
                              <span className="sm:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {t('addPurchaseBatch.table.actions')}
                              </span>
                              <div className="flex items-center gap-2 justify-center">
                                {isEditingRow ? (
                                  /* Done/Confirm Checkmark Button - ONLY active when row is valid */
                                  <button
                                    type="button"
                                    disabled={!isRowValid}
                                    onClick={() => {
                                      setEditingRowIndices({
                                        ...editingRowIndices,
                                        [index]: false,
                                      });
                                    }}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 disabled:hover:border-emerald-200"
                                    title={t(
                                      'addPurchaseBatch.table.confirmItem',
                                    )}
                                  >
                                    <Check className="h-4 w-4 text-current" />
                                  </button>
                                ) : (
                                  /* Edit Pencil Icon Button */
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingRowIndices({
                                        ...editingRowIndices,
                                        [index]: true,
                                      })
                                    }
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus:outline-none"
                                    title={t('addPurchaseBatch.table.editItem')}
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-current" />
                                  </button>
                                )}

                                {/* Delete Row Button */}
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={formData.lineItems!.length <= 1}
                                  title={t('addPurchaseBatch.table.deleteItem')}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-current" />
                                </button>

                                {/* Add Row Button - Appears ONLY on the last view-mode row of the array */}
                                {showAddButton && (
                                  <button
                                    type="button"
                                    onClick={addItem}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 focus:outline-none"
                                    title={t('addPurchaseBatch.table.addItem')}
                                  >
                                    <Plus className="h-4 w-4 text-current" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                {saveMutation.error ? (
                  <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-100">
                    {saveMutation.error.message}
                  </div>
                ) : null}

                {/* 4. Save / Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="secondary"
                    className="h-10 text-sm font-medium"
                  >
                    {t('addPurchaseBatch.actions.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    variant={editingId ? 'edit' : 'add'}
                    className="h-10 text-sm font-medium px-10"
                  >
                    <Save className="h-4 w-4 text-current" />
                    <span>
                      {saveMutation.isPending
                        ? t('addPurchaseBatch.actions.saving')
                        : editingId
                          ? t('addPurchaseBatch.actions.update')
                          : t('addPurchaseBatch.actions.save')}
                    </span>
                  </Button>
                </div>
              </form>
            )}

            {/* 5. Existing Purchase Batches Section */}
            {!showForm && (
              <div className="border-t border-slate-200 pt-8 grid gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
                      {t('addPurchaseBatch.list.title')}
                    </h3>
                    <p className="text-xs font-normal text-slate-500">
                      {t('addPurchaseBatch.list.description')}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      onClick={handleToggleNewForm}
                      variant="add"
                      className="h-10 px-5 rounded-xl border shadow-sm self-start sm:self-auto font-medium transition-all text-sm shrink-0"
                    >
                      <Plus className="h-4 w-4 text-current" />
                      <span>{t('addPurchaseBatch.list.newBatchBtn')}</span>
                    </Button>
                  )}
                </div>

                {/* Dense Card List Layout */}
                <div className="flex flex-col gap-4">
                  {isLoading ? (
                    <p className="py-12 text-center text-slate-500 text-sm font-normal">
                      {t('addPurchaseBatch.list.loading')}
                    </p>
                  ) : batches.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <ShoppingBag
                        className="mx-auto mb-3 opacity-20 text-slate-400"
                        size={48}
                      />
                      <p className="text-sm font-medium text-slate-500">
                        {t('addPurchaseBatch.list.noBatches')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3.5">
                      {paginatedBatches.map((batch) => {
                        const isExpanded = !!expandedBatches[batch.id];
                        return (
                          <Card
                            key={batch.id}
                            className="flex flex-col gap-4 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-in fade-in"
                          >
                            {/* Compact main details row */}
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between lg:gap-6">
                              {/* Left: Badge + Batch code + details grid */}
                              <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4 flex-1">
                                {/* Serial tag */}
                                <span className="inline-flex items-center justify-center shrink-0 h-8 px-2.5 rounded-lg bg-emerald-50 text-[11px] font-black text-emerald-800 ring-1 ring-emerald-600/10">
                                  #{batch.serialNumber}
                                </span>

                                {/* Batch Code */}
                                <span className="text-sm font-extrabold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 tracking-wider font-mono shrink-0">
                                  {batch.batchCode}
                                </span>

                                {/* Details elements */}
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-normal text-slate-600">
                                  {/* Date */}
                                  <span className="flex items-center gap-1.5 shrink-0">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                      {new Date(
                                        batch.purchaseDate,
                                      ).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  </span>

                                  {/* Bags count */}
                                  <span className="flex items-center gap-1.5 text-slate-750 font-medium shrink-0">
                                    <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                                    <span>
                                      {batch.numberOfBags}{' '}
                                      {t('addPurchaseBatch.card.bags')}
                                    </span>
                                  </span>

                                  {/* Seller */}
                                  <span
                                    className="flex items-center gap-1.5 text-slate-750 shrink-0 max-w-[180px] truncate"
                                    title={batch.sellerName}
                                  >
                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{batch.sellerName}</span>
                                  </span>

                                  {/* Bill */}
                                  <span className="flex items-center gap-1.5 font-mono text-slate-500 shrink-0">
                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{batch.billNumber}</span>
                                  </span>

                                  {/* Items count */}
                                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/10 shrink-0">
                                    {batch.lineItems.length}{' '}
                                    {batch.lineItems.length === 1
                                      ? t('addPurchaseBatch.card.item')
                                      : t('addPurchaseBatch.card.items')}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-2 justify-end shrink-0 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
                                <Button
                                  type="button"
                                  onClick={() => toggleExpand(batch.id)}
                                  className="h-9 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                                >
                                  {isExpanded
                                    ? t('addPurchaseBatch.card.hideItems')
                                    : t('addPurchaseBatch.card.viewItems')}
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setViewingBatch(batch)}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:scale-95 focus:outline-none"
                                  title={t(
                                    'addPurchaseBatch.card.viewDetailsTooltip',
                                  )}
                                >
                                  <Eye className="h-4 w-4 text-current" />
                                </button>
                                {canEdit && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEdit(batch)}
                                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 active:scale-95 focus:outline-none"
                                      title={t(
                                        'addPurchaseBatch.card.editTooltip',
                                      )}
                                    >
                                      <Edit3 className="h-4 w-4 text-current" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(batch.id)}
                                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 active:scale-95 focus:outline-none"
                                      title={t(
                                        'addPurchaseBatch.card.deleteTooltip',
                                      )}
                                    >
                                      <Trash2 className="h-4 w-4 text-current" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Expandable items section */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 pt-3 animate-in slide-in-from-top duration-200">
                                <div className="flex flex-wrap gap-2">
                                  {batch.lineItems.map((item, itemIndex) => (
                                    <div
                                      key={item.id ?? `${batch.id}-${itemIndex}`}
                                      className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200 shadow-sm font-medium text-slate-700"
                                    >
                                      <span className="grid size-4 place-items-center rounded bg-slate-200/80 text-[10px] font-black text-slate-600">
                                        {itemIndex + 1}
                                      </span>
                                      <span className="font-semibold text-slate-900">
                                        {item.teaPowderTypeName}
                                      </span>
                                      <span className="text-slate-300">|</span>
                                      <span className="font-semibold text-emerald-700">
                                        {formatCurrency(item.pricePerKg)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 6. Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        variant="secondary"
                        className="h-9 px-3 text-xs"
                      >
                        {t('addPurchaseBatch.pagination.previous')}
                      </Button>
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        variant="secondary"
                        className="h-9 px-3 text-xs"
                      >
                        {t('addPurchaseBatch.pagination.next')}
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-750 font-normal">
                          {t('addPurchaseBatch.pagination.showing')}{' '}
                          <span className="font-semibold">
                            {(currentPage - 1) * itemsPerPage + 1}
                          </span>{' '}
                          {t('addPurchaseBatch.pagination.to')}{' '}
                          <span className="font-semibold">
                            {Math.min(
                              currentPage * itemsPerPage,
                              batches.length,
                            )}
                          </span>{' '}
                          {t('addPurchaseBatch.pagination.of')}{' '}
                          <span className="font-semibold">
                            {batches.length}
                          </span>{' '}
                          {t('addPurchaseBatch.pagination.results')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          variant="secondary"
                          className="h-8 w-8 p-0 text-xs"
                        >
                          &lt;
                        </Button>
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((page) => (
                          <Button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? 'add' : 'secondary'}
                            className="h-8 w-8 p-0 text-xs"
                          >
                            {page}
                          </Button>
                        ))}
                        <Button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                          disabled={currentPage === totalPages}
                          variant="secondary"
                          className="h-8 w-8 p-0 text-xs"
                        >
                          &gt;
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {viewingBatch && (
          <ViewDetailsModal
            title={
              viewingBatch.batchCode ||
              t('addPurchaseBatch.modal.fallbackTitle')
            }
            subtitle={t('addPurchaseBatch.modal.subtitle')}
            onClose={() => setViewingBatch(null)}
            fields={[
              {
                label: t('addPurchaseBatch.modal.batchCode'),
                value: viewingBatch.batchCode || '—',
              },
              {
                label: t('addPurchaseBatch.modal.purchaseDate'),
                value: new Date(viewingBatch.purchaseDate).toLocaleDateString(
                  'en-IN',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  },
                ),
              },
              {
                label: t('addPurchaseBatch.modal.seller'),
                value: viewingBatch.sellerName || '—',
              },
              {
                label: t('addPurchaseBatch.modal.billNumber'),
                value: viewingBatch.billNumber || '—',
              },
              {
                label: t('addPurchaseBatch.modal.bagsCount'),
                value: `${viewingBatch.numberOfBags || 0} ${t('addPurchaseBatch.card.bags')}`,
              },
            ]}
            customBody={
              <div className="flex flex-col gap-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('addPurchaseBatch.modal.lineItemsTitle')}
                </span>
                <div className="flex flex-col gap-2">
                  {viewingBatch.lineItems.map((item: any, index: number) => (
                    <div
                      key={item.id ?? index}
                      className="flex justify-between items-center border border-slate-200 rounded-xl p-3 bg-slate-50/50"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span className="grid size-5 place-items-center rounded bg-slate-200 text-[10px] font-black text-slate-600">
                          {index + 1}
                        </span>
                        <span className="font-bold text-slate-800">
                          {item.teaPowderTypeName}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-emerald-800">
                        ₹{Number(item.pricePerKg || 0).toFixed(2)}/kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
