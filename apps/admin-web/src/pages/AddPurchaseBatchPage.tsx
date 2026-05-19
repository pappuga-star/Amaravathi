import { useState, useEffect, useMemo } from 'react';
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
import {
  AccessibleIconButton,
  Button,
  Card,
  Input,
  Field,
} from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { formatCurrency, generateBatchCode } from '@amaravathi/shared-utils';
import { ViewDetailsModal } from '../components/ViewDetailsModal';
import { useNotification } from '@/components/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../search/useSearch';
import { searchKeys } from '../search/search-query-keys';
import { SEARCH_MIN_CHARS } from '../search/search.constants';
import { AutocompleteSearchInput } from '../search/AutocompleteSearchInput';
import {
  purchaseBatchSchema as purchaseBatchZodSchema,
  type PurchaseBatch,
  type PurchaseBatchInput,
  type PurchaseBatchItemInput,
} from '@amaravathi/shared-types';
import { TeaPowderTypesPage } from './Modules';
import { Z_INDEX } from '../constants/zIndex';
import { useTabsKeyboardNavigation } from '../hooks/useTabsKeyboardNavigation';
import { STICKY_BELOW_HEADER } from '../utils/sticky';

const initialFormState = {
  purchaseDate: new Date(),
  numberOfBags: 30,
  billNumber: '',
  sellerId: '',
  sellerName: '',
  lineItems: [{ teaPowderTypeId: '', teaPowderTypeName: '', quantityKg: 0, pricePerKg: 0, totalAmount: 0 }],
};

export function AddPurchaseBatchPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] =
    useState<Partial<PurchaseBatchInput>>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const batchSearch = useSearch<PurchaseBatch>({
    moduleName: 'add-purchase-batch-page',
    queryFn: async () => ({ items: [] }),
  });
  const teaTypeSearch = useSearch<{ id: string; name: string }>({
    moduleName: 'tea-powder-types-autocomplete',
    syncUrl: false,
    queryFn: async () => ({ items: [] }),
  });

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
  const batchTabs = ['batches', 'types'] as const;
  const onBatchTabsKeyDown = useTabsKeyboardNavigation(batchTabs, activeTab, setActiveTab);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      batchSearch.setQ(q);
    }
  }, [searchParams, batchSearch]);

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
    queryKey: searchKeys.module('batches', { q: batchSearch.debouncedQ }),
    queryFn: () =>
      api<{ items: PurchaseBatch[] }>(
        `${endpoints.batches}?q=${encodeURIComponent(batchSearch.debouncedQ)}`,
      ).then((res) => res.items),
  });

  // Fetch Tea Powder Types for autocomplete option matching
  const { data: teaPowderTypes = [] } = useQuery({
    queryKey: ['teaPowderTypes'],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(
        `${endpoints.teaPowderTypes}?page=1&limit=1000`,
      ).then((res) => res.items ?? []),
  });
  const { data: teaPowderTypeSearchResults = [] } = useQuery({
    queryKey: searchKeys.autocomplete('teaPowderTypes', teaTypeSearch.debouncedQ),
    enabled: teaTypeSearch.debouncedQ.trim().length >= SEARCH_MIN_CHARS,
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(
        `${endpoints.teaPowderTypes}?q=${encodeURIComponent(
          teaTypeSearch.debouncedQ.trim(),
        )}&page=1&limit=50`,
      ).then((res) => res.items ?? []),
  });
  const allTeaPowderTypes = Array.from(
    new Map(
      [...teaPowderTypes, ...teaPowderTypeSearchResults].map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  );

  // Unique merged list of active tea powder grade/category taxonomies
  const autocompleteOptions = Array.from(
    new Set(allTeaPowderTypes.map((c) => c.name.trim())),
  ).filter(Boolean);
  const teaPowderTypeByName = new Map(
    allTeaPowderTypes.map((item) => [item.name.trim().toLowerCase(), item]),
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

    const normalizedLineItems = formData.lineItems.map((item) => {
      const teaPowderTypeName = String(item.teaPowderTypeName ?? '').trim();
      const matchedType = teaPowderTypeByName.get(
        teaPowderTypeName.toLowerCase(),
      );

      return {
        ...item,
        teaPowderTypeId:
          String(item.teaPowderTypeId ?? '').trim() || matchedType?.id || '',
        teaPowderTypeName: matchedType?.name ?? teaPowderTypeName,
      };
    });

    // Verify unique tea powder types
    const itemNames = normalizedLineItems.map((item) =>
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

    for (const item of normalizedLineItems) {
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
      lineItems: normalizedLineItems.map((item) => ({
        teaPowderTypeId: item.teaPowderTypeId,
        teaPowderTypeName: item.teaPowderTypeName,
        quantityKg: Number(item.quantityKg),
        pricePerKg: Number(item.pricePerKg),
        totalAmount: Number((Number(item.quantityKg) * Number(item.pricePerKg)).toFixed(2)),
      })),
      totalQuantityKg: Number(
        normalizedLineItems
          .reduce((sum, item) => sum + Number(item.quantityKg || 0), 0)
          .toFixed(3),
      ),
      totalBatchAmount: Number(
        normalizedLineItems
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
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(batches.length / itemsPerPage));
  const paginatedBatches = batches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, totalPages];
    if (currentPage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
  }, [currentPage, totalPages]);

  // Check if any row is currently in Edit Mode
  const hasAnyActiveEditRow = Object.values(editingRowIndices).some(
    (val) => val === true,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky Tab Buttons Container */}
      <div
        className="-mx-1 mt-1 rounded-xl bg-slate-50/95 px-1 py-1 backdrop-blur no-print"
        style={STICKY_BELOW_HEADER}
      >
        <div
          role="tablist"
          aria-label="Purchase batch sections"
          onKeyDown={onBatchTabsKeyDown}
          className="flex flex-wrap rounded-xl border border-slate-200 p-1 bg-white shadow-sm font-semibold text-slate-600"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'batches'}
            tabIndex={activeTab === 'batches' ? 0 : -1}
            onClick={() => setActiveTab('batches')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
              activeTab === 'batches'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ClipboardList size={16} />
            <span>{t('addPurchaseBatch.tabs.purchaseBatches')}</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'types'}
            tabIndex={activeTab === 'types' ? 0 : -1}
            onClick={() => setActiveTab('types')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
              activeTab === 'types'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Coffee size={16} />
            <span>{t('addPurchaseBatch.tabs.teaPowderTypes')}</span>
          </button>
        </div>
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
                    <AccessibleIconButton
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none"
                      label={t('addPurchaseBatch.form.dismissForm')}
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
                    </AccessibleIconButton>
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
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            size={18}
                          />
                          <AutocompleteSearchInput
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
                            minChars={3}
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
                                ? 'bg-red-50/20'
                                : isEditingRow
                                  ? 'bg-slate-50/30 z-30'
                                  : 'hover:bg-slate-50/20'
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
                                <AutocompleteSearchInput
                                  value={item.teaPowderTypeName}
                                  onChange={(val) => {
                                    const normalized = val.trim().toLowerCase();
                                    const matched =
                                      teaPowderTypeByName.get(normalized);
                                    updateItem(index, 'teaPowderTypeName', val);
                                    updateItem(
                                      index,
                                      'teaPowderTypeId',
                                      matched?.id ?? '',
                                    );
                                  }}
                                  onSearchTermChange={teaTypeSearch.setQ}
                                  options={autocompleteOptions}
                                  placeholder={t(
                                    'addPurchaseBatch.table.selectGrade',
                                  )}
                                  onCreateNew={(newVal) => {
                                    const normalized = newVal
                                      .trim()
                                      .toLowerCase();
                                    const existing =
                                      teaPowderTypeByName.get(normalized);
                                    if (existing) {
                                      updateItem(
                                        index,
                                        'teaPowderTypeName',
                                        existing.name,
                                      );
                                      updateItem(
                                        index,
                                        'teaPowderTypeId',
                                        existing.id,
                                      );
                                      return;
                                    }
                                    createPowderTypeMutation.mutate(newVal, {
                                      onSuccess: (newType) => {
                                        updateItem(
                                          index,
                                          'teaPowderTypeName',
                                          newType.name,
                                        );
                                        updateItem(
                                          index,
                                          'teaPowderTypeId',
                                          newType.id,
                                        );
                                      },
                                    });
                                  }}
                                  minChars={3}
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
                                  <AccessibleIconButton
                                    type="button"
                                    disabled={!isRowValid}
                                    onClick={() => {
                                      setEditingRowIndices({
                                        ...editingRowIndices,
                                        [index]: false,
                                      });
                                    }}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 disabled:hover:border-emerald-200"
                                    label={t('addPurchaseBatch.table.confirmItem')}
                                  >
                                    <Check className="h-4 w-4 text-current" />
                                  </AccessibleIconButton>
                                ) : (
                                  /* Edit Pencil Icon Button */
                                  <AccessibleIconButton
                                    type="button"
                                    onClick={() =>
                                      setEditingRowIndices({
                                        ...editingRowIndices,
                                        [index]: true,
                                      })
                                    }
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus:outline-none"
                                    label={t('addPurchaseBatch.table.editItem')}
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-current" />
                                  </AccessibleIconButton>
                                )}

                                {/* Delete Row Button */}
                                <AccessibleIconButton
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={formData.lineItems!.length <= 1}
                                  label={t('addPurchaseBatch.table.deleteItem')}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-current" />
                                </AccessibleIconButton>

                                {/* Add Row Button - Appears ONLY on the last view-mode row of the array */}
                                {showAddButton && (
                                  <AccessibleIconButton
                                    type="button"
                                    onClick={addItem}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 focus:outline-none"
                                    label={t('addPurchaseBatch.table.addItem')}
                                  >
                                    <Plus className="h-4 w-4 text-current" />
                                  </AccessibleIconButton>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

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
              <div className="border-t border-slate-200 pt-6 grid gap-5 animate-in fade-in duration-300">
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
                <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex w-full items-center gap-2 sm:max-w-xl">
                    <div className="relative w-full sm:max-w-xs">
                      <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <Input
                        value={batchSearch.q}
                        onChange={(e) => batchSearch.setQ(e.target.value)}
                        placeholder="Search items..."
                        className="h-9 pl-8 text-xs"
                      />
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-100 whitespace-nowrap">
                      Total Records: {batches.length}
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500">
                    Page Size: {itemsPerPage}
                  </p>
                </div>

                {/* Dense Card List Layout */}
                <div className="max-h-[62vh] overflow-auto rounded-xl border border-slate-200 p-3">
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
                <div className="grid gap-3">
                      {paginatedBatches.map((batch) => {
                        const isExpanded = !!expandedBatches[batch.id];
                        return (
                          <Card
                            key={batch.id}
                            className="flex flex-col gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-in fade-in"
                          >
                            {/* Compact main details row */}
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:gap-5">
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
                              <div className="flex items-center gap-2 justify-end shrink-0 border-t border-slate-100 pt-2.5 md:border-t-0 md:pt-0">
                                <Button
                                  type="button"
                                  onClick={() => toggleExpand(batch.id)}
                                  className="h-9 px-3.5 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                                >
                                  {isExpanded
                                    ? t('addPurchaseBatch.card.hideItems')
                                    : t('addPurchaseBatch.card.viewItems')}
                                </Button>
                                <AccessibleIconButton
                                  type="button"
                                  onClick={() => setViewingBatch(batch)}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:scale-95 focus:outline-none"
                                  label={t(
                                    'addPurchaseBatch.card.viewDetailsTooltip',
                                  )}
                                >
                                  <Eye className="h-4 w-4 text-current" />
                                </AccessibleIconButton>
                                {canEdit && (
                                  <>
                                    <AccessibleIconButton
                                      type="button"
                                      onClick={() => handleEdit(batch)}
                                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 active:scale-95 focus:outline-none"
                                      label={t(
                                        'addPurchaseBatch.card.editTooltip',
                                      )}
                                    >
                                      <Edit3 className="h-4 w-4 text-current" />
                                    </AccessibleIconButton>
                                    <AccessibleIconButton
                                      type="button"
                                      onClick={() => handleDelete(batch.id)}
                                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 active:scale-95 focus:outline-none"
                                      label={t(
                                        'addPurchaseBatch.card.deleteTooltip',
                                      )}
                                    >
                                      <Trash2 className="h-4 w-4 text-current" />
                                    </AccessibleIconButton>
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
                </div>

                {/* 6. Pagination */}
                <div className="mt-1 border-t border-slate-200 px-1 pt-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-750 font-normal">
                      Showing <span className="font-semibold">{batches.length ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>{' '}
                      to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, batches.length)}</span>{' '}
                      of <span className="font-semibold">{batches.length}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        aria-label="Go to first page"
                        title="Go to first page"
                      >
                        {'<<'}
                      </Button>
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        aria-label="Go to previous page"
                        title="Go to previous page"
                      >
                        {'<'}
                      </Button>
                      {pageNumbers.map((page: number, idx: number) => {
                        const prev = pageNumbers[idx - 1];
                        const gapBefore = prev && page - prev > 1;
                        return (
                          <div key={page} className="flex items-center gap-1.5">
                            {gapBefore ? <span className="text-[10px] text-slate-400">...</span> : null}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`h-8 min-w-8 rounded-md border px-2 text-xs font-semibold ${
                                currentPage === page
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        aria-label="Go to next page"
                        title="Go to next page"
                      >
                        {'>'}
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        aria-label="Go to last page"
                        title="Go to last page"
                      >
                        {'>>'}
                      </Button>
                    </div>
                  </div>
                </div>
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
            headerMeta={(
              <>
                <span className="inline-flex items-center rounded-md border border-emerald-500/60 bg-emerald-700/60 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                  {viewingBatch.numberOfBags || 0} {t('addPurchaseBatch.card.bags')}
                </span>
                <span className="inline-flex items-center rounded-md border border-emerald-500/60 bg-emerald-700/60 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                  {viewingBatch.lineItems.length} {t('addPurchaseBatch.card.items')}
                </span>
              </>
            )}
            fields={[]}
            customBody={
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t('addPurchaseBatch.modal.seller')}
                  </div>
                  <div className="mt-1 text-base font-bold text-slate-800">
                    {viewingBatch.sellerName || '—'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
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
                      label: t('addPurchaseBatch.modal.billNumber'),
                      value: viewingBatch.billNumber || '—',
                    },
                  ].map((detail, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {detail.label}
                      </div>
                      <div className="mt-1 text-base font-bold text-slate-800">
                        {detail.value}
                      </div>
                    </div>
                  ))}
                </div>

                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block border-t border-slate-100 pt-4">
                  {t('addPurchaseBatch.modal.lineItemsTitle')}
                </span>
                <div className="flex flex-col gap-2">
                  {viewingBatch.lineItems.map((item: any, index: number) => (
                    <div
                      key={item.id ?? index}
                      className="flex justify-between items-center border border-slate-200 rounded-xl p-3 bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span className="grid size-5 place-items-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-800 text-[13px]">
                          {item.teaPowderTypeName}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
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
