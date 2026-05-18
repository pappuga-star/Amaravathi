import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GlobalSearchFabProps {
  onClick: () => void;
}

export const GlobalSearchFab = ({ onClick }: GlobalSearchFabProps) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group no-print">
      {/* Tooltip */}
      <span
        className={`bg-slate-900/90 text-white text-[11px] font-semibold tracking-wide py-1.5 px-3 rounded-lg shadow-xl backdrop-blur-sm transition-all duration-200 select-none ${
          showTooltip
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 translate-x-2 pointer-events-none'
        }`}
      >
        Search Everywhere (Ctrl+K)
      </span>

      {/* FAB Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Search Everywhere (Ctrl + K)"
        title="Search Everywhere (Ctrl + K)"
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl hover:shadow-emerald-600/30 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 relative border border-emerald-500/20"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-10 group-hover:opacity-20 transition-opacity" />
        <Search className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" />
      </button>
    </div>
  );
};
