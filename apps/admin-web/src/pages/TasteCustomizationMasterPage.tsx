import { useState, useEffect } from 'react';
import { Layers, Contact, Beaker } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CustomersPage } from './Modules';
import { CustomerFormulasPage } from './CustomerFormulasPage';
import { SavedFormulasPage } from './SavedFormulasPage';
import { CustomerTeaFormula } from '@amaravathi/shared-types';
import { useTranslation } from 'react-i18next';

export const TasteCustomizationMasterPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<
    'customizations' | 'saved-formulas' | 'customers'
  >('customizations');

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap rounded-xl border border-slate-200 p-1 bg-white shadow-sm font-semibold text-slate-600 no-print">
        <button
          onClick={() => handleTabChange('customizations')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm transition-all ${
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
