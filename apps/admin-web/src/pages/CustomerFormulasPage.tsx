import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Search,
  Edit3,
  Trash2,
  Copy,
  Star,
  Plus,
  X,
  DollarSign,
  Eye,
  Check,
} from 'lucide-react';
import { Button, Card, Input } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { ViewDetailsModal } from '../components/ViewDetailsModal';
import { useNotification } from '../components/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CustomerTeaFormula,
  CustomerTeaFormulaLineItem,
  PurchaseBatch,
} from '@amaravathi/shared-types';

interface CustomerFormulasPageProps {
  editingFormula?: CustomerTeaFormula | null;
  onCancelEdit?: () => void;
}

export const CustomerFormulasPage = ({
  editingFormula,
  onCancelEdit,
}: CustomerFormulasPageProps) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast, showError } = useNotification();
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Fetch single formula if URL id is provided
  const { data: fetchedFormula, isLoading: isFetchingFormula } = useQuery({
    queryKey: ['formula', id],
    queryFn: () =>
      api<CustomerTeaFormula>(`${endpoints.customerTeaFormulas}/${id}`),
    enabled: !!id,
  });

  const formulaToUse = editingFormula || fetchedFormula;
  const editingId = id || editingFormula?.id || null;

  // Form Fields State
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState<CustomerTeaFormulaLineItem[]>([
    {
      purchaseBatchCode: '',
      purchaseBatchLineItemId: '',
      ingredientCategory: 'Leaf',
      ingredientName: '',
      quantityInGrams: 0,
      pricePerGram: 0,
      rowCost: 0,
    },
  ]);
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [lockedRows, setLockedRows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (formulaToUse) {
      setCustomerId(
        typeof formulaToUse.customerId === 'object'
          ? (formulaToUse.customerId as any).id ||
              (formulaToUse.customerId as any)._id ||
              String(formulaToUse.customerId)
          : String(formulaToUse.customerId),
      );
      setLineItems(
        formulaToUse.lineItems.map((item) => ({
          purchaseBatchCode: item.purchaseBatchCode,
          purchaseBatchLineItemId:
            typeof item.purchaseBatchLineItemId === 'object'
              ? (item.purchaseBatchLineItemId as any).id ||
                (item.purchaseBatchLineItemId as any)._id ||
                String(item.purchaseBatchLineItemId)
              : String(item.purchaseBatchLineItemId),
          ingredientCategory: item.ingredientCategory,
          ingredientName: item.ingredientName,
          quantityInGrams: item.quantityInGrams,
          pricePerGram: item.pricePerGram,
          rowCost: item.rowCost,
        })),
      );
      setIsDefault(formulaToUse.isDefault || false);
      setNotes(formulaToUse.notes || '');
      setStatus(formulaToUse.status);

      const initialLocked: Record<number, boolean> = {};
      formulaToUse.lineItems.forEach((_, idx) => {
        initialLocked[idx] = true;
      });
      setLockedRows(initialLocked);
    } else {
      resetForm();
    }
  }, [formulaToUse]);

  // Quick Add Customer State
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddMobile, setQuickAddMobile] = useState('');

  const handleQuickAddCustomer = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!quickAddName.trim()) return;
    try {
      const res = await api<{ id: string; name: string }>(endpoints.customers, {
        method: 'POST',
        body: JSON.stringify({
          name: quickAddName.trim(),
          mobileNumber: quickAddMobile.trim() || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: [endpoints.customers] });
      setCustomerId(res.id);
      setShowQuickAddCustomer(false);
      setQuickAddName('');
      setQuickAddMobile('');
    } catch (err: any) {
      showError(err);
    }
  };

  // Fetch Session permissions
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{ name: string; email: string; role: string }>('/auth/me'),
  });
  const isAdmin = me?.role === 'admin';
  const canEdit = me?.role === 'admin' || me?.role === 'pricing_manager';

  // Fetch Customers
  const { data: customersData } = useQuery({
    queryKey: [endpoints.customers],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(
        `${endpoints.customers}?limit=100`,
      ),
  });
  const customers = customersData?.items ?? [];

  // Fetch Purchase Batches
  const { data: batchesData } = useQuery({
    queryKey: ['batchesList'],
    queryFn: () =>
      api<{ items: PurchaseBatch[] }>(`${endpoints.batches}?limit=100`),
  });
  const batches = batchesData?.items ?? [];

  // Mutate Operations
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (editingId) {
        return api(`${endpoints.customerTeaFormulas}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return api(endpoints.customerTeaFormulas, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      resetForm();
      showToast(
        editingId
          ? t('customerFormulas.messages.updatedSuccess')
          : t('customerFormulas.messages.savedSuccess'),
        'success',
      );
      queryClient.invalidateQueries({
        queryKey: [endpoints.customerTeaFormulas],
      });
      if (onCancelEdit) {
        onCancelEdit();
      } else if (id) {
        navigate('/taste-customization?tab=saved-formulas');
      }
    },
    onError: (err: any) => {
      showError(err);
    },
  });
  // Line Item Grid handlers
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        purchaseBatchCode: '',
        purchaseBatchLineItemId: '',
        ingredientCategory: 'Leaf',
        ingredientName: '',
        quantityInGrams: 0,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
    const shiftedLocked: Record<number, boolean> = {};
    lineItems.forEach((_, idx) => {
      if (idx < index) {
        if (lockedRows[idx]) shiftedLocked[idx] = true;
      } else if (idx > index) {
        if (lockedRows[idx]) shiftedLocked[idx - 1] = true;
      }
    });
    setLockedRows(shiftedLocked);
  };

  const updateLineItem = (
    index: number,
    fields: Partial<CustomerTeaFormulaLineItem>,
  ) => {
    const updated = [...lineItems];
    const current = {
      ...updated[index],
      ...fields,
    } as CustomerTeaFormulaLineItem;

    if (fields.purchaseBatchCode !== undefined) {
      current.purchaseBatchLineItemId = '';
      current.ingredientName = '';
      current.pricePerGram = 0;
      current.rowCost = 0;
      current.ingredientCategory = 'Leaf';
    }

    if (fields.ingredientName !== undefined) {
      const selectedBatch = batches.find(
        (b) => b.batchCode === current.purchaseBatchCode,
      );
      const batchItem = selectedBatch?.items.find(
        (i) => i.teaPowderType === fields.ingredientName,
      );
      if (batchItem) {
        current.pricePerGram =
          batchItem.pricePerGram ?? batchItem.ratePerKg / 1000;
        current.purchaseBatchLineItemId =
          (batchItem as any)._id?.toString() || '';
        current.ingredientCategory =
          batchItem.ingredientCategory ||
          (batchItem.teaPowderType.toLowerCase().includes('dust') ||
          batchItem.teaPowderType.toLowerCase().includes('color') ||
          batchItem.teaPowderType.toLowerCase().includes('lumsa')
            ? 'Add-On'
            : 'Leaf');
      } else {
        current.pricePerGram = 0;
        current.purchaseBatchLineItemId = '';
        current.ingredientCategory = 'Leaf';
      }
    }

    current.rowCost = Number(
      (current.quantityInGrams * current.pricePerGram).toFixed(4),
    );
    updated[index] = current;
    setLineItems(updated);
  };

  // Inline Validation: Duplicate combination of (Batch Code + Ingredient Name)
  const duplicateKeys = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    lineItems.forEach((item) => {
      if (item.purchaseBatchCode && item.ingredientName) {
        const key = `${item.purchaseBatchCode.toLowerCase()}:${item.ingredientName.toLowerCase()}`;
        if (seen.has(key)) {
          duplicates.add(key);
        }
        seen.add(key);
      }
    });
    return duplicates;
  }, [lineItems]);

  // Inline Validation: Quantities must not exceed available stock in grams
  const stockErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    lineItems.forEach((item, idx) => {
      if (
        item.purchaseBatchCode &&
        item.ingredientName &&
        item.quantityInGrams > 0
      ) {
        const selectedBatch = batches.find(
          (b) => b.batchCode === item.purchaseBatchCode,
        );
        const batchItem = selectedBatch?.items.find(
          (i) => i.teaPowderType === item.ingredientName,
        );
        if (batchItem) {
          const stock =
            batchItem.availableStockInGrams ??
            selectedBatch!.numberOfBags * 50000;
          if (item.quantityInGrams > stock) {
            errors[idx] = t('customerFormulas.messages.stockAvailable').replace(
              '{{stock}}',
              String(stock),
            );
          }
        }
      }
    });
    return errors;
  }, [lineItems, batches]);

  // Sticky Live Widget Calculations
  const liveTotals = useMemo(() => {
    let totalWeight = 0;
    let totalFormulaCost = 0;

    lineItems.forEach((item) => {
      totalWeight += Number(item.quantityInGrams) || 0;
      totalFormulaCost += Number(item.rowCost) || 0;
    });

    const costPerKg =
      totalWeight > 0
        ? Number(((totalFormulaCost / totalWeight) * 1000).toFixed(2))
        : 0;
    const costPer100Grams =
      totalWeight > 0
        ? Number(((totalFormulaCost / totalWeight) * 100).toFixed(2))
        : 0;

    return {
      totalWeight: Number(totalWeight.toFixed(2)),
      totalFormulaCost: Number(totalFormulaCost.toFixed(2)),
      costPerKg,
      costPer100Grams,
    };
  }, [lineItems]);

  const resetForm = () => {
    setCustomerId('');
    setLineItems([
      {
        purchaseBatchCode: '',
        purchaseBatchLineItemId: '',
        ingredientCategory: 'Leaf',
        ingredientName: '',
        quantityInGrams: 0,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);
    setLockedRows({});
    setIsDefault(false);
    setNotes('');
    setStatus('Active');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, boolean> = {};
    if (!customerId) errors.customerId = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast(t('customerFormulas.messages.fillRequired'), 'error');
      setTimeout(() => {
        const firstInvalidField = document.querySelector(
          '.border-red-500, select.border-red-500, input.border-red-500',
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

    if (lineItems.length === 0) {
      showToast(t('customerFormulas.messages.addAtLeastOne'), 'error');
      return;
    }

    if (duplicateKeys.size > 0) {
      showToast(t('customerFormulas.messages.duplicateFound'), 'error');
      return;
    }

    if (Object.keys(stockErrors).length > 0) {
      showToast(t('customerFormulas.messages.stockLimit'), 'error');
      return;
    }

    const payload = {
      customerId,
      notes: notes.trim(),
      lineItems: lineItems.map((item) => ({
        purchaseBatchCode: item.purchaseBatchCode,
        purchaseBatchLineItemId: item.purchaseBatchLineItemId,
        ingredientCategory: item.ingredientCategory,
        ingredientName: item.ingredientName,
        quantityInGrams: Number(item.quantityInGrams),
        pricePerGram: Number(item.pricePerGram),
        rowCost: Number(item.rowCost),
      })),
      isDefault,
      status,
      totalWeight: liveTotals.totalWeight,
      totalFormulaCost: liveTotals.totalFormulaCost,
      costPerKg: liveTotals.costPerKg,
      costPer100Grams: liveTotals.costPer100Grams,
    };

    console.log('Submitting Customer Tea Formula Payload:');
    console.log(JSON.stringify(payload, null, 2));

    saveMutation.mutate(payload);
  };

  if (id && isFetchingFormula) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm font-medium text-slate-500">
            {t('customerFormulas.loadingFormula') ||
              'Loading formula details...'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 2. Create/Edit Panel Form Drawer (Shows when active) */}
      <Card className="p-6 border border-emerald-100 bg-emerald-50/10 rounded-xl shadow-md flex flex-col gap-4 relative">
        <h3 className="text-lg font-bold text-slate-800">
          {editingId
            ? 'Edit Customer Taste Customization'
            : t('customerFormulas.title') ||
              'Design Customer Taste Customization'}
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4">
              <div className="grid gap-1.5 w-full md:w-1/2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {t('customerFormulas.customer')}{' '}
                    <span className="text-red-500">*</span>
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowQuickAddCustomer(!showQuickAddCustomer)
                      }
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                    >
                      <Plus size={12} />{' '}
                      {t('customerFormulas.quickAddCustomer')}
                    </button>
                  )}
                </div>

                {showQuickAddCustomer && (
                  <div className="grid gap-3 sm:grid-cols-3 bg-slate-50 border border-slate-200 rounded-lg p-3 my-1">
                    <Input
                      type="text"
                      placeholder={t('customerFormulas.customerName')}
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      type="text"
                      placeholder={t('customerFormulas.mobileOptional')}
                      value={quickAddMobile}
                      onChange={(e) => setQuickAddMobile(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={(e) => handleQuickAddCustomer(e)}
                        variant="add"
                        className="h-9 text-xs flex-1"
                        disabled={!quickAddName.trim()}
                      >
                        {t('customerFormulas.save')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowQuickAddCustomer(false);
                          setQuickAddName('');
                          setQuickAddMobile('');
                        }}
                        variant="secondary"
                        className="h-9 text-xs flex-1 bg-white"
                      >
                        {t('customerFormulas.cancel')}
                      </Button>
                    </div>
                  </div>
                )}

                <select
                  className={`h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-800 ${
                    formErrors.customerId
                      ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                      : 'border-slate-300'
                  }`}
                  value={customerId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerId(val);
                  }}
                  required
                  disabled={!canEdit}
                >
                  <option value="">
                    {t('customerFormulas.selectCustomer')}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Blending Grid */}
            <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">
                  {t('customerFormulas.ingredientsTitle')}
                </h4>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-xs uppercase tracking-wide">
                        {t('customerFormulas.purchaseBatch')}
                      </th>
                      <th className="px-3 py-2 text-xs uppercase tracking-wide">
                        {t('customerFormulas.leafAddOnType')}
                      </th>
                      <th className="px-3 py-2 text-xs uppercase tracking-wide w-32">
                        {t('customerFormulas.quantityGrams')}
                      </th>
                      <th className="px-3 py-2 text-xs uppercase tracking-wide w-24">
                        {t('customerFormulas.priceGram')}
                      </th>
                      <th className="px-3 py-2 text-xs uppercase tracking-wide w-28">
                        {t('customerFormulas.price')}
                      </th>
                      <th className="px-3 py-2 text-xs uppercase tracking-wide w-24 text-center">
                        {t('customerFormulas.action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {lineItems.map((item, idx) => {
                      const selectedBatch = batches.find(
                        (b) => b.batchCode === item.purchaseBatchCode,
                      );
                      const filteredIngredients = selectedBatch
                        ? selectedBatch.items
                        : [];
                      const isDuplicate = !!(
                        item.purchaseBatchCode &&
                        item.ingredientName &&
                        duplicateKeys.has(
                          `${item.purchaseBatchCode.toLowerCase()}:${item.ingredientName.toLowerCase()}`,
                        )
                      );
                      const stockError = stockErrors[idx];

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          {/* Batch Code Selection */}
                          <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                            {lockedRows[idx] ? (
                              <span>{item.purchaseBatchCode}</span>
                            ) : (
                              <select
                                className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                value={item.purchaseBatchCode}
                                onChange={(e) =>
                                  updateLineItem(idx, {
                                    purchaseBatchCode: e.target.value,
                                  })
                                }
                                disabled={!canEdit}
                              >
                                <option value="">
                                  {t('customerFormulas.selectBatch')}
                                </option>
                                {batches.map((b) => (
                                  <option key={b.id} value={b.batchCode}>
                                    {b.batchCode} ({b.sellerName})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          {/* Ingredient selection */}
                          <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                            {lockedRows[idx] ? (
                              <span>{item.ingredientName}</span>
                            ) : (
                              <>
                                <select
                                  className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  value={item.ingredientName}
                                  onChange={(e) =>
                                    updateLineItem(idx, {
                                      ingredientName: e.target.value,
                                    })
                                  }
                                  disabled={!item.purchaseBatchCode || !canEdit}
                                >
                                  <option value="">
                                    {t('customerFormulas.selectIngredient')}
                                  </option>
                                  {filteredIngredients.map((i) => (
                                    <option
                                      key={i.subSerialNumber}
                                      value={i.teaPowderType}
                                    >
                                      {i.teaPowderType}
                                    </option>
                                  ))}
                                </select>
                                {isDuplicate && (
                                  <span className="text-[10px] font-bold text-red-500 block mt-0.5">
                                    {t('customerFormulas.duplicateSelection')}
                                  </span>
                                )}
                              </>
                            )}
                          </td>

                          {/* Quantity Grams */}
                          <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                            {lockedRows[idx] ? (
                              <span>{item.quantityInGrams} g</span>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  min="1"
                                  className={`w-full h-9 rounded-lg border px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                    stockError || isDuplicate
                                      ? 'border-red-300 bg-red-50/20'
                                      : 'border-slate-200'
                                  }`}
                                  value={item.quantityInGrams || ''}
                                  onChange={(e) =>
                                    updateLineItem(idx, {
                                      quantityInGrams: Math.max(
                                        0,
                                        Number(e.target.value),
                                      ),
                                    })
                                  }
                                  placeholder={t('customerFormulas.grams')}
                                  disabled={!item.ingredientName || !canEdit}
                                />
                                {stockError && (
                                  <span className="text-[10px] font-bold text-red-500 block mt-0.5 whitespace-normal">
                                    {stockError}
                                  </span>
                                )}
                              </>
                            )}
                          </td>

                          {/* Price Per Gram */}
                          <td className="px-3 py-2 text-xs font-mono font-bold text-slate-500">
                            ₹
                            {item.pricePerGram
                              ? item.pricePerGram.toFixed(4)
                              : '0.0000'}
                          </td>

                          {/* Row Cost */}
                          <td className="px-3 py-2 text-xs font-bold text-slate-700">
                            ₹{item.rowCost ? item.rowCost.toFixed(2) : '0.00'}
                          </td>

                          {/* Action columns: Tick mark / Edit, Plus, and Delete */}
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {lockedRows[idx] ? (
                                /* Edit/Pencil Button to unlock */
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLockedRows({
                                      ...lockedRows,
                                      [idx]: false,
                                    })
                                  }
                                  disabled={!canEdit}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40"
                                  title={t('customerFormulas.editRow')}
                                >
                                  <Edit3 size={14} />
                                </button>
                              ) : (
                                /* Green Tick Mark Button to lock */
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                                  title={t(
                                    'customerFormulas.confirmIngredient',
                                  )}
                                  disabled={
                                    !item.purchaseBatchCode ||
                                    !item.ingredientName ||
                                    item.quantityInGrams <= 0 ||
                                    !!stockError ||
                                    isDuplicate
                                  }
                                  onClick={() => {
                                    setLockedRows({
                                      ...lockedRows,
                                      [idx]: true,
                                    });
                                  }}
                                >
                                  <Check size={14} />
                                </button>
                              )}

                              {/* Plus button to append new row */}
                              <button
                                type="button"
                                onClick={addLineItem}
                                disabled={!canEdit}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                                title={t('customerFormulas.addIngredientRow')}
                              >
                                <Plus size={14} />
                              </button>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                disabled={!canEdit}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                title={t('customerFormulas.removeItem')}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 mt-2">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">
                  {t('customerFormulas.notesRemarks')}
                </span>
                <Input
                  type="text"
                  placeholder={t('customerFormulas.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    disabled={!canEdit}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('customerFormulas.setDefault')}</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    {t('customerFormulas.status')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={status === 'Active'}
                      onChange={(e) =>
                        setStatus(e.target.checked ? 'Active' : 'Inactive')
                      }
                      disabled={!canEdit}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Bottom Blending Pricing Widget */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm mt-2">
            <div className="flex items-center gap-6">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 border-r border-emerald-200/50 pr-6">
                <DollarSign size={14} className="text-emerald-600" />{' '}
                {t('customerFormulas.billingDetails')}
              </h4>

              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {t('customerFormulas.totalWeight')}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {liveTotals.totalWeight} g
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {t('customerFormulas.totalCost')}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    ₹{liveTotals.totalFormulaCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-emerald-600 rounded-lg flex items-center gap-4 text-white shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-100 font-semibold uppercase tracking-wider">
                    {t('customerFormulas.costPerKg')}
                  </span>
                  <span className="text-lg font-black leading-none">
                    ₹{liveTotals.costPerKg.toFixed(2)}
                  </span>
                </div>
                <div className="h-8 w-px bg-emerald-500"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-100 font-semibold uppercase tracking-wider">
                    {t('customerFormulas.costPer100g')}
                  </span>
                  <span className="text-sm font-bold text-emerald-50">
                    ₹{liveTotals.costPer100Grams.toFixed(2)}
                  </span>
                </div>
              </div>

              {(editingId || onCancelEdit) && (
                <Button
                  type="button"
                  onClick={() => {
                    if (onCancelEdit) {
                      onCancelEdit();
                    } else {
                      navigate('/taste-customization?tab=saved-formulas');
                    }
                  }}
                  variant="secondary"
                  className="h-10 px-4 text-sm bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                variant="add"
                className="h-10 px-8 text-sm shadow-md transition-transform active:scale-95"
                disabled={saveMutation.isPending || !canEdit}
              >
                <Save size={16} className="mr-1" />
                <span>{editingId ? 'Update Formula' : 'Save Formula'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
