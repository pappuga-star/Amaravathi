import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Printer,
  ChevronRight,
  Calculator,
  Layers,
  Activity,
  UserCheck,
  ShoppingBag,
  Sparkles,
  ClipboardList,
  Save,
} from 'lucide-react';
import { Button, Card, Input } from '@amaravathi/shared-ui';
import { api, endpoints } from '../lib/api';
import { useNotification } from '../components/NotificationContext';
import { useTranslation } from 'react-i18next';
import { useTabsKeyboardNavigation } from '../hooks/useTabsKeyboardNavigation';

type CustomerTeaFormula = {
  id: string;
  customerId: { id: string; name: string } | string;
  formulaCode: string;
  leafCategoryId: { id: string; name: string; basePrice: number } | string;
  addons: { name: string; price: number; gramsPerKg: number }[];
  finalPrice: number;
  marginPercent: number;
  isDefault: boolean;
  notes?: string;
  status: 'Active' | 'Inactive';
};

export const SalesQuotationPlannerPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast, showError, confirm } = useNotification();
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'sales' | 'quote' | 'planner'>(
    'sales',
  );
  const plannerTabs: Array<'sales' | 'quote' | 'planner'> = [
    'sales',
    'quote',
    'planner',
  ];
  const onPlannerTabsKeyDown = useTabsKeyboardNavigation(plannerTabs, activeTab, setActiveTab);

  // Core Data Queries
  const { data: customersData } = useQuery({
    queryKey: [endpoints.customers],
    queryFn: () =>
      api<{ items: { id: string; name: string }[] }>(
        `${endpoints.customers}?limit=100`,
      ),
  });
  const customers = customersData?.items ?? [];

  const { data: formulasData } = useQuery({
    queryKey: [endpoints.customerTeaFormulas],
    queryFn: () =>
      api<{ items: CustomerTeaFormula[] }>(
        `${endpoints.customerTeaFormulas}?status=active&limit=100`,
      ),
  });
  const activeFormulas = formulasData?.items ?? [];

  // --- 1. SALES ENTRY TAB STATE & MUTATIONS ---
  const [salesCustomer, setSalesCustomer] = useState('');
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [salesQuantity, setSalesQuantity] = useState<number>(100);
  const [salesBags, setSalesBags] = useState<number>(3);
  const [salesBillNumber, setSalesBillNumber] = useState('');
  const [salesSuccessMsg, setSalesSuccessMsg] = useState('');

  // Auto-filter formulas for selected sales customer
  const filteredSalesFormulas = useMemo(() => {
    return activeFormulas.filter((f) => {
      const custId =
        typeof f.customerId === 'object' ? f.customerId.id : f.customerId;
      return custId === salesCustomer;
    });
  }, [salesCustomer, activeFormulas]);

  // Default auto-loader: when customer is chosen, find their default formula
  const handleSalesCustomerChange = (customerId: string) => {
    setSalesCustomer(customerId);
    setSalesSuccessMsg('');
    const defaultFormula = activeFormulas.find((f) => {
      const custId =
        typeof f.customerId === 'object' ? f.customerId.id : f.customerId;
      return custId === customerId && f.isDefault;
    });
    if (defaultFormula) {
      setSelectedFormulaId(defaultFormula.id);
    } else {
      setSelectedFormulaId('');
    }
  };

  const selectedSalesFormula = useMemo(() => {
    return activeFormulas.find((f) => f.id === selectedFormulaId);
  }, [selectedFormulaId, activeFormulas]);

  const salesLeaf = useMemo(() => {
    if (!selectedSalesFormula) return null;
    return typeof selectedSalesFormula.leafCategoryId === 'object'
      ? selectedSalesFormula.leafCategoryId
      : { name: 'Leaf Category', basePrice: 0 };
  }, [selectedSalesFormula]);

  const salesRatePerKg = selectedSalesFormula?.finalPrice ?? 0;
  const salesTotalCost = salesQuantity * salesRatePerKg;

  // Mutation to record a purchase batch transaction from formula sales entry
  const recordBatchMutation = useMutation({
    mutationFn: (payload: any) =>
      api(endpoints.batches, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSalesSuccessMsg(
        t('salesQuotationPlanner.sales.successLog').replace(
          '{{bill}}',
          salesBillNumber,
        ),
      );
      showToast(t('salesQuotationPlanner.sales.successToast'), 'success');
      setSalesCustomer('');
      setSelectedFormulaId('');
      setSalesQuantity(100);
      setSalesBags(3);
      setSalesBillNumber('');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (err: any) => {
      showError(err);
    },
  });

  const handleSalesSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, boolean> = {};
    if (!salesCustomer) errors.salesCustomer = true;
    if (!selectedFormulaId) errors.selectedFormulaId = true;
    if (!salesBillNumber.trim()) errors.salesBillNumber = true;
    if (salesQuantity <= 0) errors.salesQuantity = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast(t('salesQuotationPlanner.sales.fillRequired'), 'error');
      setTimeout(() => {
        const firstInvalidField = document.querySelector(
          '.border-rose-500, input.border-rose-500, select.border-rose-500',
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

    const customerObj = customers.find((c) => c.id === salesCustomer);
    const formulaObj = activeFormulas.find((f) => f.id === selectedFormulaId);

    if (!customerObj || !formulaObj) return;

    // Direct mapping to Purchase Batch payload to link formula seamlessly
    const payload = {
      purchaseDate: new Date(),
      numberOfBags: salesBags,
      billNumber: salesBillNumber.trim(),
      sellerName: customerObj.name,
      items: [
        {
          teaPowderType: `Custom Blend (${formulaObj.formulaCode})`,
          ratePerKg: formulaObj.finalPrice,
        },
      ],
    };
    recordBatchMutation.mutate(payload);
  };

  // --- 2. QUOTATION CREATOR TAB STATE ---
  const [quoteCustomer, setQuoteCustomer] = useState('');
  const [quoteFormulaId, setQuoteFormulaId] = useState('');
  const [quoteQuantity, setQuoteQuantity] = useState<number>(500);
  const [quoteMarkup, setQuoteMarkup] = useState<number>(10); // in percent

  const filteredQuoteFormulas = useMemo(() => {
    return activeFormulas.filter((f) => {
      const custId =
        typeof f.customerId === 'object' ? f.customerId.id : f.customerId;
      return custId === quoteCustomer;
    });
  }, [quoteCustomer, activeFormulas]);

  const handleQuoteCustomerChange = (customerId: string) => {
    setQuoteCustomer(customerId);
    const defaultFormula = activeFormulas.find((f) => {
      const custId =
        typeof f.customerId === 'object' ? f.customerId.id : f.customerId;
      return custId === customerId && f.isDefault;
    });
    if (defaultFormula) {
      setQuoteFormulaId(defaultFormula.id);
    } else {
      setQuoteFormulaId('');
    }
  };

  const selectedQuoteFormula = useMemo(() => {
    return activeFormulas.find((f) => f.id === quoteFormulaId);
  }, [quoteFormulaId, activeFormulas]);

  const quoteLeaf = useMemo(() => {
    if (!selectedQuoteFormula) return null;
    return typeof selectedQuoteFormula.leafCategoryId === 'object'
      ? selectedQuoteFormula.leafCategoryId
      : { name: 'Leaf Category', basePrice: 0 };
  }, [selectedQuoteFormula]);

  const quoteBaseRate = selectedQuoteFormula?.finalPrice ?? 0;
  const quoteFinalRate = quoteBaseRate + (quoteBaseRate * quoteMarkup) / 100;
  const quoteTotalValue = quoteQuantity * quoteFinalRate;

  // --- 3. MATERIAL PLANNER AGGREGATOR ---
  const planningSummary = useMemo(() => {
    const categories: Record<
      string,
      { name: string; totalKg: number; basePrice: number }
    > = {};
    let totalAssignedFormulas = 0;

    // Use default active formulas as the primary planner indicators
    activeFormulas.forEach((formula) => {
      if (!formula.isDefault) return;
      totalAssignedFormulas++;

      // Leaf base planning allocation (e.g. assume a standard batch requirement of 1,000 kg per active custom default)
      const multiplier = 1000;
      if (typeof formula.leafCategoryId === 'object') {
        const leaf = formula.leafCategoryId;
        if (!categories[leaf.id]) {
          categories[leaf.id] = {
            name: leaf.name,
            totalKg: 0,
            basePrice: leaf.basePrice,
          };
        }
        const targetCategory = categories[leaf.id];
        if (targetCategory) {
          targetCategory.totalKg += multiplier;
        }
      }
    });

    return {
      categories: Object.values(categories),
      totalAssigned: totalAssignedFormulas,
    };
  }, [activeFormulas]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Navigation header */}
      <div
        className="flex overflow-x-auto rounded-xl border border-slate-200 p-1 bg-white shadow-sm font-semibold text-slate-600 no-print"
        role="tablist"
        aria-label="Sales quotation planner tabs"
        onKeyDown={onPlannerTabsKeyDown}
      >
        <button
          onClick={() => setActiveTab('sales')}
          role="tab"
          aria-selected={activeTab === 'sales'}
          tabIndex={activeTab === 'sales' ? 0 : -1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
            activeTab === 'sales'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={16} />
          <span>{t('salesQuotationPlanner.tabs.salesAndFormula')}</span>
        </button>
        <button
          onClick={() => setActiveTab('quote')}
          role="tab"
          aria-selected={activeTab === 'quote'}
          tabIndex={activeTab === 'quote' ? 0 : -1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
            activeTab === 'quote'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Calculator size={16} />
          <span>{t('salesQuotationPlanner.tabs.quotationsInvoice')}</span>
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          role="tab"
          aria-selected={activeTab === 'planner'}
          tabIndex={activeTab === 'planner' ? 0 : -1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
            activeTab === 'planner'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Layers size={16} />
          <span>{t('salesQuotationPlanner.tabs.materialPlanner')}</span>
        </button>
      </div>

      {/* --- TAB 1: SALES & FORMULA ENTRY --- */}
      {activeTab === 'sales' && (
        <div className="grid gap-6 lg:grid-cols-3 no-print">
          {/* Main Input Form */}
          <Card className="lg:col-span-2 p-6 border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {t('salesQuotationPlanner.sales.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('salesQuotationPlanner.sales.subtitle')}
              </p>
            </div>

            {salesSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-sm font-semibold flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-600" />
                {salesSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSalesSubmit} className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>{t('salesQuotationPlanner.sales.customerLabel')}</span>
                  <select
                    className={`h-10 rounded-lg border px-3 text-sm bg-white ${
                      formErrors.salesCustomer
                        ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                        : 'border-slate-300'
                    }`}
                    value={salesCustomer}
                    onChange={(e) => handleSalesCustomerChange(e.target.value)}
                    required
                  >
                    <option value="">
                      {t('salesQuotationPlanner.sales.selectCustomer')}
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>
                    {t('salesQuotationPlanner.sales.customBlendRecipe')}
                  </span>
                  <select
                    className={`h-10 rounded-lg border px-3 text-sm bg-white ${
                      formErrors.selectedFormulaId
                        ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                        : 'border-slate-300'
                    }`}
                    value={selectedFormulaId}
                    onChange={(e) => setSelectedFormulaId(e.target.value)}
                    disabled={!salesCustomer}
                    required
                  >
                    <option value="">
                      {salesCustomer
                        ? filteredSalesFormulas.length === 0
                          ? t('salesQuotationPlanner.sales.noFormulas')
                          : t('salesQuotationPlanner.sales.selectCustomBlend')
                        : t('salesQuotationPlanner.sales.chooseCustomerFirst')}
                    </option>
                    {filteredSalesFormulas.map((f) => (
                      <option key={f.id} value={f.id}>
                        Blend {f.formulaCode}{' '}
                        {f.isDefault
                          ? t('salesQuotationPlanner.sales.defaultLabel')
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>
                    {t('salesQuotationPlanner.sales.dispatchQuantity')}
                  </span>
                  <Input
                    className={
                      formErrors.salesQuantity
                        ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                        : 'border-slate-200'
                    }
                    type="number"
                    min="1"
                    value={salesQuantity || ''}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value) || 0);
                      setSalesQuantity(qty);
                      setSalesBags(Math.ceil(qty / 30));
                    }}
                    required
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>{t('salesQuotationPlanner.sales.bagsCount')}</span>
                  <Input
                    type="number"
                    min="1"
                    value={salesBags || ''}
                    onChange={(e) =>
                      setSalesBags(Math.max(1, parseInt(e.target.value) || 0))
                    }
                    required
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  <span>{t('salesQuotationPlanner.sales.billNumber')}</span>
                  <Input
                    className={
                      formErrors.salesBillNumber
                        ? 'border-rose-500 ring-1 ring-rose-500 animate-pulse'
                        : 'border-slate-200'
                    }
                    type="text"
                    placeholder={t(
                      'salesQuotationPlanner.sales.billPlaceholder',
                    )}
                    value={salesBillNumber}
                    onChange={(e) => setSalesBillNumber(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="add"
                  className="h-10 px-6"
                  disabled={
                    recordBatchMutation.isPending ||
                    !salesCustomer ||
                    !selectedFormulaId
                  }
                >
                  <Save size={16} />
                  <span>{t('salesQuotationPlanner.sales.logInvoiceSale')}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Sticky Calculator Summary panel */}
          <div className="h-max flex flex-col gap-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50/20">
            <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} />{' '}
              {t('salesQuotationPlanner.sales.autoCalcRates')}
            </h4>

            {selectedSalesFormula ? (
              <div className="flex flex-col gap-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>{t('salesQuotationPlanner.sales.blendName')}</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                    {selectedSalesFormula.formulaCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {t('salesQuotationPlanner.sales.basePrice').replace(
                      '{{name}}',
                      salesLeaf?.name || '',
                    )}
                  </span>
                  <span className="font-semibold text-slate-800">
                    ₹{salesLeaf?.basePrice.toFixed(2)}/kg
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>{t('salesQuotationPlanner.sales.customAddons')}</span>
                  <span className="font-semibold text-slate-800">
                    + ₹
                    {(
                      selectedSalesFormula.addons?.reduce(
                        (sum, a) => sum + (Number(a.price) || 0),
                        0,
                      ) || 0
                    ).toFixed(2)}
                    /kg
                  </span>
                </div>

                <div className="border-t border-emerald-200/50 my-1 pt-2 flex justify-between text-base font-bold text-emerald-800">
                  <span>{t('salesQuotationPlanner.sales.preCalcRate')}</span>
                  <span>₹{salesRatePerKg.toFixed(2)}/kg</span>
                </div>

                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>{t('salesQuotationPlanner.sales.estTotalWeight')}</span>
                  <span className="text-slate-800 font-bold">
                    {salesQuantity} kg
                  </span>
                </div>

                <div className="flex justify-between text-lg font-black text-emerald-950 border-t border-emerald-200/50 pt-2">
                  <span>
                    {t('salesQuotationPlanner.sales.netInvoiceValue')}
                  </span>
                  <span>₹{salesTotalCost.toLocaleString('en-IN')}.00</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t('salesQuotationPlanner.sales.waitingForSelection')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: QUOTATIONS INVOICE --- */}
      {activeTab === 'quote' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Controls Panel */}
          <Card className="lg:col-span-1 p-5 border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col gap-4 no-print">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calculator size={18} /> {t('salesQuotationPlanner.quote.title')}
            </h3>

            <div className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>{t('salesQuotationPlanner.quote.selectClient')}</span>
                <select
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-700"
                  value={quoteCustomer}
                  onChange={(e) => handleQuoteCustomerChange(e.target.value)}
                >
                  <option value="">
                    {t('salesQuotationPlanner.sales.selectCustomer')}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>{t('salesQuotationPlanner.quote.tailoredFormula')}</span>
                <select
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-700"
                  value={quoteFormulaId}
                  onChange={(e) => setQuoteFormulaId(e.target.value)}
                  disabled={!quoteCustomer}
                >
                  <option value="">
                    {quoteCustomer
                      ? filteredQuoteFormulas.length === 0
                        ? t('salesQuotationPlanner.quote.noActiveFormulas')
                        : t('salesQuotationPlanner.quote.selectFormulaRecipe')
                      : t('salesQuotationPlanner.sales.chooseCustomerFirst')}
                  </option>
                  {filteredQuoteFormulas.map((f) => (
                    <option key={f.id} value={f.id}>
                      Blend {f.formulaCode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>{t('salesQuotationPlanner.quote.orderVolume')}</span>
                <Input
                  type="number"
                  min="1"
                  value={quoteQuantity || ''}
                  onChange={(e) =>
                    setQuoteQuantity(Math.max(1, parseInt(e.target.value) || 0))
                  }
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>{t('salesQuotationPlanner.quote.standardMarkup')}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={quoteMarkup}
                  onChange={(e) =>
                    setQuoteMarkup(Math.max(0, parseFloat(e.target.value) || 0))
                  }
                />
              </label>
            </div>

            {selectedQuoteFormula && (
              <Button
                onClick={() => window.print()}
                variant="add"
                className="h-10 mt-2 gap-1.5"
              >
                <Printer size={16} />
                <span>{t('salesQuotationPlanner.quote.printQuotation')}</span>
              </Button>
            )}
          </Card>

          {/* Quotation Slip Preview Page */}
          <div className="lg:col-span-2">
            {selectedQuoteFormula ? (
              <Card className="p-8 border border-slate-200 bg-white rounded-2xl shadow-md flex flex-col gap-6 relative printable-quotation">
                {/* Quotation Header */}
                <div className="flex justify-between items-start border-b pb-5">
                  <div>
                    <h2 className="text-2xl font-black text-emerald-800 tracking-tight">
                      {t('salesQuotationPlanner.quote.companyName')}
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      {t('salesQuotationPlanner.quote.division')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                      {t('salesQuotationPlanner.quote.officialQuotation')}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {t('salesQuotationPlanner.quote.ref')} Q-
                      {selectedQuoteFormula.formulaCode}-
                      {new Date().getFullYear()}
                    </p>
                  </div>
                </div>

                {/* Quotation Details */}
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('salesQuotationPlanner.quote.preparedFor')}
                    </h4>
                    <p className="font-bold text-slate-800">
                      {customers.find((c) => c.id === quoteCustomer)?.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('salesQuotationPlanner.quote.activeClient')}
                    </p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('salesQuotationPlanner.quote.quotationDate')}
                    </h4>
                    <p className="font-semibold text-slate-700">
                      {new Date().toLocaleDateString('en-IN', {
                        dateStyle: 'long',
                      })}
                    </p>
                  </div>
                </div>

                {/* Custom Blend Formulation Breakdown Table */}
                <div className="border rounded-xl overflow-hidden mt-2">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b text-slate-500 font-bold text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3">
                          {t('salesQuotationPlanner.quote.specItem')}
                        </th>
                        <th className="px-4 py-3 text-right">
                          {t('salesQuotationPlanner.quote.details')}
                        </th>
                        <th className="px-4 py-3 text-right">
                          {t('salesQuotationPlanner.quote.rateComponent')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="px-4 py-3 font-semibold">
                          {t(
                            'salesQuotationPlanner.quote.baseLeafCategory',
                          ).replace('{{name}}', quoteLeaf?.name || '')}
                        </td>
                        <td className="px-4 py-3 text-slate-400 italic text-right text-xs">
                          {t('salesQuotationPlanner.quote.standardGradeLeaves')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{quoteLeaf?.basePrice.toFixed(2)}/kg
                        </td>
                      </tr>
                      {selectedQuoteFormula.addons?.map((addon, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-semibold">
                            {t(
                              'salesQuotationPlanner.quote.customAddon',
                            ).replace('{{name}}', addon.name)}
                          </td>
                          <td className="px-4 py-3 text-slate-400 italic text-right text-xs">
                            {t(
                              'salesQuotationPlanner.quote.customParameter',
                            ).replace('{{grams}}', addon.gramsPerKg.toString())}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            +₹{addon.price.toFixed(2)}/kg
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-emerald-800">
                          {t(
                            'salesQuotationPlanner.quote.customRecipeSellingPrice',
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 italic text-right text-xs">
                          {t('salesQuotationPlanner.quote.formulaSubtotal')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-800">
                          ₹{quoteBaseRate.toFixed(2)}/kg
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold text-blue-700">
                          {t(
                            'salesQuotationPlanner.quote.quotationMarkupMargin',
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 italic text-right text-xs">
                          {t(
                            'salesQuotationPlanner.quote.markupAdjustment',
                          ).replace('{{markup}}', quoteMarkup.toString())}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          +₹{((quoteBaseRate * quoteMarkup) / 100).toFixed(2)}
                          /kg
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/20 text-base font-bold text-emerald-900 border-t-2">
                        <td className="px-4 py-3">
                          {t('salesQuotationPlanner.quote.finalQuotedRate')}
                        </td>
                        <td className="px-4 py-3 text-slate-400 italic text-right text-xs font-normal">
                          {t('salesQuotationPlanner.quote.allInclusive')}
                        </td>
                        <td className="px-4 py-3 text-right font-black">
                          ₹{quoteFinalRate.toFixed(2)}/kg
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Subtotal metrics footer */}
                <div className="flex flex-col gap-1.5 self-end w-full sm:w-[350px] border-t-2 border-slate-100 pt-4 text-sm font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>{t('salesQuotationPlanner.quote.targetVolume')}</span>
                    <span className="text-slate-800">{quoteQuantity} kg</span>
                  </div>
                  <div className="flex justify-between text-base text-slate-900 font-bold border-t border-slate-100 mt-1 pt-2">
                    <span>
                      {t('salesQuotationPlanner.quote.totalEstimated')}
                    </span>
                    <span className="text-emerald-800 font-black text-xl">
                      ₹{quoteTotalValue.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                </div>

                {/* Terms and Signatures */}
                <div className="border-t border-slate-200 pt-5 mt-4 grid grid-cols-2 text-[10px] text-slate-400 font-semibold gap-10">
                  <div>
                    <p className="uppercase tracking-wider font-bold mb-1 text-slate-500">
                      {t('salesQuotationPlanner.quote.standardTerms')}
                    </p>
                    <p>{t('salesQuotationPlanner.quote.termsDesc')}</p>
                  </div>
                  <div className="text-right flex flex-col justify-end items-end gap-1">
                    <p className="w-28 border-b border-slate-300 mb-1"></p>
                    <p className="uppercase tracking-wider font-bold text-slate-500">
                      {t('salesQuotationPlanner.quote.authSignature')}
                    </p>
                    <p>{t('salesQuotationPlanner.quote.signatureDesc')}</p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid place-items-center py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-xl shadow-sm">
                <p className="text-sm text-slate-400 italic font-semibold">
                  {t('salesQuotationPlanner.quote.waitingPreview')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: MATERIAL PLANNER AGGREGATOR --- */}
      {activeTab === 'planner' && (
        <div className="grid gap-6">
          {/* General Planner Stat summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 flex items-center gap-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {t('salesQuotationPlanner.planner.defaultCustomerBlends')}
                </p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {planningSummary.totalAssigned}{' '}
                  {t('salesQuotationPlanner.planner.active')}
                </h4>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {t('salesQuotationPlanner.planner.standardBatchAllocation')}
                </p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {t('salesQuotationPlanner.planner.perCustomer')}
                </h4>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {t('salesQuotationPlanner.planner.aggPlanningDemand')}
                </p>
                <h4 className="text-2xl font-bold text-slate-800">
                  {(planningSummary.totalAssigned * 1000).toLocaleString(
                    'en-IN',
                  )}{' '}
                  {t('salesQuotationPlanner.planner.kg')}
                </h4>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Base Leaves Demand Sheet */}
            <Card className="p-5 border border-slate-200 bg-white rounded-xl shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={16} className="text-slate-600" />
                  {t('salesQuotationPlanner.planner.baseLeafDemand')}
                </h3>
              </div>
              <div className="overflow-auto rounded-lg border border-slate-100">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">
                        {t('salesQuotationPlanner.planner.leafGrade')}
                      </th>
                      <th className="px-4 py-2.5 text-center">
                        {t('salesQuotationPlanner.planner.avgBaseCost')}
                      </th>
                      <th className="px-4 py-2.5 text-right">
                        {t('salesQuotationPlanner.planner.reqInventoryVol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {planningSummary.categories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-slate-400 italic"
                        >
                          {t(
                            'salesQuotationPlanner.planner.noActiveDefaultBlends',
                          )}
                        </td>
                      </tr>
                    ) : (
                      planningSummary.categories.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            ₹{c.basePrice.toFixed(2)}/
                            {t('salesQuotationPlanner.planner.kg')}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                            {c.totalKg.toLocaleString('en-IN')}{' '}
                            {t('salesQuotationPlanner.planner.kg')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>


          </div>
        </div>
      )}
    </div>
  );
};
