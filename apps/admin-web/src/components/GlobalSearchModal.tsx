import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, History, X, CornerDownLeft } from 'lucide-react';
import { GroupedSearchResults, SearchResultItem } from '../lib/globalSearchApi';
import { SearchResultList } from './SearchResultList';
import { SearchSuggestionsDropdown } from '../search/SearchSuggestionsDropdown';
import { SearchNoResults } from '../search/SearchNoResults';
import { Portal } from './ui/Portal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useClickOutside } from '../hooks/useClickOutside';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { Z_INDEX } from '../constants/zIndex';
import { AccessibleIconButton } from '@amaravathi/shared-ui';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  results: GroupedSearchResults;
  totalResults: number;
  quality?: {
    correctedQuery?: string;
    suggestions?: Array<{ text: string; type: 'completion' | 'popular' | 'entity' }>;
  };
  suggestions?: Array<{ text: string; type: 'completion' | 'popular' | 'entity' }>;
  isLoading: boolean;
  recentSearches: string[];
  addRecentSearch: (term: string) => void;
  clearRecentSearches: () => void;
}

export const GlobalSearchModal = ({
  isOpen,
  onClose,
  query,
  setQuery,
  results,
  totalResults,
  quality,
  suggestions = [],
  isLoading,
  recentSearches,
  addRecentSearch,
  clearRecentSearches,
}: GlobalSearchModalProps) => {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const flatResults = React.useMemo(() => {
    return [
      ...(results.customers || []),
      ...(results.savedBlends || []),
      ...(results.purchaseBatches || []),
      ...(results.generalItems || []),
      ...(results.teaPowderTypes || []),
      ...(results.suppliers || []),
      ...(results.batchIngredients || []),
      ...(results.customerTeaBlends || []),
    ];
  }, [results]);

  useBodyScrollLock(isOpen);
  useEscapeKey(isOpen, onClose);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Reset selectedIndex when results list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useClickOutside(modalRef, isOpen, onClose);

  // Keyboard navigation inside modal: Up, Down, Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || flatResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = flatResults[selectedIndex];
        if (selectedItem) {
          handleSelectItem(selectedItem);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  const handleSelectItem = (item: SearchResultItem) => {
    addRecentSearch(query || item.label);
    onClose();
    navigate(item.route);
  };

  if (!isOpen) return null;

  const hasResults = flatResults.length > 0;

  return (
    <Portal>
    <div
      className="fixed inset-0 flex items-start justify-center pt-16 md:pt-28 px-4 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      style={{ zIndex: Z_INDEX.commandPalette }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[75vh] md:max-h-[60vh] overflow-hidden backdrop-blur-md animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100 dark:border-slate-800 h-14 shrink-0">
          <Search className="text-slate-400 dark:text-slate-500" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers, formulas, purchase batches, general items, sellers, ingredients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-full text-base bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
          {isLoading ? (
            <Loader2 className="animate-spin text-emerald-600 shrink-0" size={18} />
          ) : query ? (
            <AccessibleIconButton
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              label="Clear search"
            >
              <X size={16} />
            </AccessibleIconButton>
          ) : null}
        </div>

        {/* Search Content Body */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200">
          {query.trim() ? (
            <SearchSuggestionsDropdown
              suggestions={suggestions}
              onSelect={(value) => setQuery(value)}
            />
          ) : null}
          {/* Case 1: Empty Search Term & Recent Searches */}
          {!query.trim() ? (
            <div className="space-y-4 py-2">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <History size={12} /> Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[10px] font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-colors"
                      title="Clear all recent searches"
                      aria-label="Clear all recent searches"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((term, index) => (
                      <div
                        key={index}
                        onClick={() => setQuery(term)}
                        className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors text-sm text-slate-700 dark:text-slate-300 font-medium"
                      >
                        <History size={14} className="text-slate-400" />
                        <span className="flex-1 truncate">{term}</span>
                        <kbd className="hidden sm:inline-flex items-center h-5 select-none gap-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1.5 font-mono text-[9px] font-medium text-slate-400">
                          Click to Search
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                  <p className="text-sm font-semibold">
                    Search Everywhere across Amaravathi Tea Management
                  </p>
                  <p className="text-xs mt-1.5 max-w-sm mx-auto">
                    Press <kbd className="bg-slate-100 dark:bg-slate-800 border px-1 rounded font-mono text-[10px]">Ctrl + K</kbd> to activate. Search for customers, formulas, purchase bills, general items, suppliers, or tea powders instantly.
                  </p>
                </div>
              )}
            </div>
          ) : isLoading && !hasResults ? (
            /* Case 2: Loading State */
            <div className="flex flex-col justify-center items-center py-16 gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Searching modules...
              </p>
            </div>
          ) : !hasResults ? (
            <SearchNoResults
              query={query}
              {...(quality?.correctedQuery ? { didYouMean: quality.correctedQuery } : {})}
              alternatives={(quality?.suggestions ?? []).map((s) => s.text)}
              onSelect={(value) => setQuery(value)}
            />
          ) : (
            /* Case 4: Results List rendering */
            <SearchResultList
              results={results}
              flatResults={flatResults}
              selectedIndex={selectedIndex}
              searchQuery={query}
              onSelectItem={handleSelectItem}
              onHoverItem={setSelectedIndex}
            />
          )}
        </div>

        {/* Command Palette Footer Info */}
        <div className="h-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 font-mono text-[9px]">
                Esc
              </kbd>{' '}
              to close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 font-mono text-[9px]">
                ↑↓
              </kbd>{' '}
              to navigate
            </span>
          </div>
          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-500">
            Open Result <CornerDownLeft size={9} />
          </span>
        </div>
      </div>
    </div>
    </Portal>
  );
};
