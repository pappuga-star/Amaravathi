import React from 'react';
import { Search } from 'lucide-react';
import { AccessibleIconButton } from '@amaravathi/shared-ui';
import { Z_INDEX } from '../constants/zIndex';

interface GlobalSearchFabProps {
  onClick: () => void;
}

export const GlobalSearchFab = ({ onClick }: GlobalSearchFabProps) => {
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 group no-print"
      style={{ zIndex: Z_INDEX.notificationCenter }}
    >
      <AccessibleIconButton
        onClick={onClick}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl hover:shadow-emerald-600/30 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 relative border border-emerald-500/20"
        label="Search Everywhere (Ctrl + K)"
        tooltipPosition="left"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-10 group-hover:opacity-20 transition-opacity" />
        <Search className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-300 group-hover:scale-110" />
      </AccessibleIconButton>
    </div>
  );
};
