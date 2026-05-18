import { useCallback } from 'react';

export function useTabsKeyboardNavigation<T extends string>(
  tabs: readonly T[],
  activeTab: T,
  onSelect: (tab: T) => void,
) {
  return useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      if (!nextTab) return;
      onSelect(nextTab);
    },
    [activeTab, onSelect, tabs],
  );
}
