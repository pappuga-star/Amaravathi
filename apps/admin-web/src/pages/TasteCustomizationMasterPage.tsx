import { useState, useEffect } from 'react';
import { Layers, Contact, Beaker } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CustomersPage } from './Modules';
import { CustomerFormulasPage } from './CustomerFormulasPage';
import { SavedFormulasPage } from './SavedFormulasPage';
import { CustomerTeaFormula } from '@amaravathi/shared-types';
import { useTranslation } from 'react-i18next';
import { useTabsKeyboardNavigation } from '../hooks/useTabsKeyboardNavigation';

export const TasteCustomizationMasterPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<
    'customizations' | 'saved-formulas' | 'customers'
  >('customizations');
  const customizationTabs: Array<
    'customizations' | 'saved-formulas' | 'customers'
  > = ['customizations', 'saved-formulas', 'customers'];

  const [editingFormula, setEditingFormula] =
    useState<CustomerTeaFormula | null>(null);

  useEffect(() => {
    if (
      tabParam === 'customizations' ||
      tabParam === 'saved-formulas' ||
      tabParam === 'customers'
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (
    tab: 'customizations' | 'saved-formulas' | 'customers',
  ) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const onCustomizationTabsKeyDown = useTabsKeyboardNavigation(
    customizationTabs,
    activeTab,
    handleTabChange,
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap rounded-xl border border-slate-200 p-1 bg-white shadow-sm font-semibold text-slate-600 no-print"
        role="tablist"
        aria-label="Taste customization tabs"
        onKeyDown={onCustomizationTabsKeyDown}
      >
        <button
          onClick={() => handleTabChange('customizations')}
          role="tab"
          aria-selected={activeTab === 'customizations'}
          tabIndex={activeTab === 'customizations' ? 0 : -1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
            activeTab === 'customizations'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Beaker size={16} />
          <span className="hidden sm:inline">
            {t('customizationTabs.teaBlends')}
          </span>
        </button>
        <button
          onClick={() => handleTabChange('saved-formulas')}
          role="tab"
          aria-selected={activeTab === 'saved-formulas'}
          tabIndex={activeTab === 'saved-formulas' ? 0 : -1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
            activeTab === 'saved-formulas'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Layers size={16} />
          <span className="hidden sm:inline">
            {t('customizationTabs.savedBlends')}
          </span>
        </button>
        <button
          onClick={() => handleTabChange('customers')}
          role="tab"
          aria-selected={activeTab === 'customers'}
          tabIndex={activeTab === 'customers' ? 0 : -1}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
            activeTab === 'customers'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Contact size={16} />
          <span className="hidden sm:inline">
            {t('customizationTabs.customers')}
          </span>
        </button>
      </div>

      <div className="min-w-0">
        {activeTab === 'customizations' && (
          <CustomerFormulasPage
            editingFormula={editingFormula}
            onCancelEdit={() => {
              setEditingFormula(null);
              handleTabChange('saved-formulas');
            }}
          />
        )}
        {activeTab === 'saved-formulas' && (
          <SavedFormulasPage
            onEdit={(formula) => {
              setEditingFormula(formula);
              handleTabChange('customizations');
            }}
          />
        )}
        {activeTab === 'customers' && <CustomersPage />}
      </div>
    </div>
  );
};
