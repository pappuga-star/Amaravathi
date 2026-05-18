import { RefObject, useEffect } from 'react';

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  enabled: boolean,
  onOutsideClick: () => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) {
        onOutsideClick();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, enabled, onOutsideClick]);
}
