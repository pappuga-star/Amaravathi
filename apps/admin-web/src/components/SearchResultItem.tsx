import React from 'react';
import {
  Users,
  Beaker,
  ClipboardList,
  Truck,
  Package,
  Layers,
  ChevronRight,
  CornerDownLeft,
} from 'lucide-react';
import { SearchResultItem as ISearchResultItem } from '../lib/globalSearchApi';

interface SearchResultItemProps {
  item: ISearchResultItem;
  isSelected: boolean;
  searchQuery: string;
  onClick: () => void;
  onMouseEnter: () => void;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  customer: <Users size={16} className="text-purple-600" />,
  savedBlend: <Layers size={16} className="text-emerald-600" />,
  customerTeaBlend: <Beaker size={16} className="text-blue-600" />,
  purchaseBatch: <ClipboardList size={16} className="text-indigo-600" />,
  batchIngredient: <Package size={16} className="text-amber-600" />,
  supplier: <Truck size={16} className="text-orange-600" />,
  teaPowderType: <Package size={16} className="text-slate-600" />,
};

const MODULE_BG: Record<string, string> = {
  customer: 'bg-purple-50',
  savedBlend: 'bg-emerald-50',
  customerTeaBlend: 'bg-blue-50',
  purchaseBatch: 'bg-indigo-50',
  batchIngredient: 'bg-amber-50',
  supplier: 'bg-orange-50',
  teaPowderType: 'bg-slate-50',
};

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) {
    return <span>{text}</span>;
  }
  const escapedQuery = query.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-emerald-100 text-emerald-950 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}

export const SearchResultItem = ({
  item,
  isSelected,
  searchQuery,
  onClick,
  onMouseEnter,
}: SearchResultItemProps) => {
  const icon = MODULE_ICONS[item.type] || MODULE_ICONS.teaPowderType;
  const bgClass = MODULE_BG[item.type] || MODULE_BG.teaPowderType;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
        isSelected
          ? 'bg-emerald-50/70 border-emerald-200 shadow-sm'
          : 'bg-white hover:bg-slate-50/50 border-slate-100'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`p-2.5 rounded-lg shrink-0 ${bgClass}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800 truncate">
              <HighlightText text={item.label} query={searchQuery} />
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
              {item.type}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            <HighlightText text={item.subtitle} query={searchQuery} />
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {isSelected ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-md border border-emerald-200">
            <span>Press Enter</span>
            <CornerDownLeft size={10} />
          </span>
        ) : (
          <ChevronRight
            size={14}
            className="text-slate-300 group-hover:translate-x-0.5 transition-transform"
          />
        )}
      </div>
    </div>
  );
};
