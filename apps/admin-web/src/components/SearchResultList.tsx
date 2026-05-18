import React from 'react';
import { GroupedSearchResults, SearchResultItem as ISearchResultItem } from '../lib/globalSearchApi';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultListProps {
  results: GroupedSearchResults;
  selectedIndex: number;
  searchQuery: string;
  onSelectItem: (item: ISearchResultItem) => void;
  onHoverItem: (index: number) => void;
  flatResults: ISearchResultItem[];
}

const MODULE_HEADERS: Record<keyof GroupedSearchResults, string> = {
  customers: 'Customers & Profiles',
  savedBlends: 'Saved Blends',
  customerTeaBlends: 'Customer Tea Blends',
  purchaseBatches: 'Purchase Batches & Codes',
  batchIngredients: 'Batch Ingredients',
  teaPowderTypes: 'Inventory & Ingredient Types',
  suppliers: 'Sellers (Suppliers)',
};

export const SearchResultList = ({
  results,
  selectedIndex,
  searchQuery,
  onSelectItem,
  onHoverItem,
  flatResults,
}: SearchResultListProps) => {
  const moduleOrder: (keyof GroupedSearchResults)[] = [
    'customers',
    'savedBlends',
    'purchaseBatches',
    'teaPowderTypes',
    'suppliers',
    'batchIngredients',
    'customerTeaBlends',
  ];

  let currentIndexOffset = 0;

  return (
    <div className="space-y-4">
      {moduleOrder.map((moduleKey) => {
        const groupItems = results[moduleKey];
        if (!groupItems || groupItems.length === 0) return null;

        const startIdx = currentIndexOffset;
        currentIndexOffset += groupItems.length;

        return (
          <div key={moduleKey} className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5">
              {MODULE_HEADERS[moduleKey]} ({groupItems.length})
            </h3>
            <div className="space-y-1">
              {groupItems.map((item, localIdx) => {
                const globalIdx = startIdx + localIdx;
                return (
                  <SearchResultItem
                    key={item._id}
                    item={item}
                    isSelected={selectedIndex === globalIdx}
                    searchQuery={searchQuery}
                    onClick={() => onSelectItem(item)}
                    onMouseEnter={() => onHoverItem(globalIdx)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
