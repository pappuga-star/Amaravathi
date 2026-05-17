import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, FileText, Beaker, Users, ChevronRight, CornerDownLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

type SearchResultItem = {
  id: string;
  formulaCode?: string;
  customerName?: string;
  leafCategoryName?: string;
  cuttingTypeName?: string;
  finalPrice?: number;
  status?: string;

  serialNumber?: number;
  batchCode?: string;
  billNumber?: string;
  sellerName?: string;
  purchaseDate?: string;
  numberOfBags?: number;

  name?: string;
  mobileNumber?: string;
  address?: string;
  active?: boolean;
};

type SearchResults = {
  tasteCustomizations: SearchResultItem[];
  purchaseBatches: SearchResultItem[];
  customers: SearchResultItem[];
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debouncing logic (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Load current user context
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ role: string }>('/auth/me'),
  });
  const role = me?.role;

  // Global Ctrl/Cmd + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch search results
  const { data: results, isFetching } = useQuery<SearchResults>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) {
        return { tasteCustomizations: [], purchaseBatches: [], customers: [] };
      }
      const response = await api<{ success: boolean; data: SearchResults }>(
        `/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      return response.data;
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Handle click outside modal to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectItem = (type: 'formula' | 'batch' | 'customer', item: SearchResultItem) => {
    setIsOpen(false);
    setQuery('');
    if (type === 'formula') {
      navigate(`/taste-customization?q=${encodeURIComponent(item.formulaCode || '')}`);
    } else if (type === 'batch') {
      navigate(`/purchase-batch?q=${encodeURIComponent(item.batchCode || String(item.serialNumber) || '')}`);
    } else if (type === 'customer') {
      navigate(`/taste-customization?tab=customers&q=${encodeURIComponent(item.name || '')}`);
    }
  };

  const hasResults =
    results &&
    (results.tasteCustomizations.length > 0 ||
      results.purchaseBatches.length > 0 ||
      (results.customers && results.customers.length > 0));

  return (
    <>
      {/* Search trigger button in header */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-between w-64 md:w-80 h-10 px-3 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 rounded-lg text-slate-400 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
      >
        <span className="flex items-center gap-2">
          <Search size={16} className="text-slate-400" />
          <span>Search system...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center h-5 select-none gap-0.5 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div
            ref={modalRef}
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 border-b border-slate-100 h-14 shrink-0">
              <Search className="text-slate-400" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search formulas, purchase batches, sellers, customers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-full text-base outline-none text-slate-800 placeholder-slate-400"
              />
              {isFetching ? (
                <Loader2 className="animate-spin text-emerald-600" size={18} />
              ) : query ? (
                <button
                  onClick={() => setQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded px-1.5 py-0.5"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!query.trim() ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">Type a search query to inspect items...</p>
                  <p className="text-xs mt-2">
                    Viewer role can search only <span className="font-semibold">Customer Customizations</span> and <span className="font-semibold">Purchase Batches</span>.
                  </p>
                </div>
              ) : isFetching && !results ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
              ) : !hasResults ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-sm">No matches found for "{query}"</p>
                  <p className="text-xs mt-1">Double check your spelling or search params.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Taste Customizations */}
                  {results && results.tasteCustomizations.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Blend Customizations ({results.tasteCustomizations.length})
                      </h3>
                      <div className="space-y-1">
                        {results.tasteCustomizations.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => selectItem('formula', item)}
                            className="flex items-center justify-between p-2.5 hover:bg-emerald-50/50 rounded-lg cursor-pointer group transition-colors border border-transparent hover:border-emerald-100"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                                <Beaker size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                                  {item.formulaCode}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Customer:{' '}
                                  <span className="font-medium text-slate-700">{item.customerName}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                ₹{item.finalPrice}/kg
                              </span>
                              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Purchase Batches */}
                  {results && results.purchaseBatches.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Purchase Batches ({results.purchaseBatches.length})
                      </h3>
                      <div className="space-y-1">
                        {results.purchaseBatches.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => selectItem('batch', item)}
                            className="flex items-center justify-between p-2.5 hover:bg-emerald-50/50 rounded-lg cursor-pointer group transition-colors border border-transparent hover:border-emerald-100"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                                <FileText size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                                  Batch Code: {item.batchCode}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Serial: <span className="font-medium">#{item.serialNumber}</span> • Seller:{' '}
                                  <span className="font-medium text-slate-700">{item.sellerName}</span> • Bill:{' '}
                                  <span className="font-medium text-slate-700">{item.billNumber}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-500">
                                {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : ''}
                              </span>
                              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Customers (Hidden if role is viewer) */}
                  {role !== 'viewer' && results && results.customers && results.customers.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
                        Customers ({results.customers.length})
                      </h3>
                      <div className="space-y-1">
                        {results.customers.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => selectItem('customer', item)}
                            className="flex items-center justify-between p-2.5 hover:bg-emerald-50/50 rounded-lg cursor-pointer group transition-colors border border-transparent hover:border-emerald-100"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-purple-50 rounded-lg text-purple-700">
                                <Users size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-800">
                                  {item.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Mobile: <span className="font-medium text-slate-700">{item.mobileNumber}</span> • Address:{' '}
                                  <span className="font-medium text-slate-600">{item.address}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  item.active
                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}
                              >
                                {item.active ? 'Active' : 'Inactive'}
                              </span>
                              <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Command Palette Footer */}
            <div className="h-10 border-t border-slate-100 bg-slate-50 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border rounded px-1.5 py-0.5 font-mono">Esc</kbd> to close
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-white border rounded px-1.5 py-0.5 font-mono">⌘K</kbd> to toggle
                </span>
              </div>
              <span className="flex items-center gap-1">
                Select result <CornerDownLeft size={10} />
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
