import { useEffect, useMemo, useState, useRef } from 'react';
import { Input } from '@amaravathi/shared-ui';
import { SEARCH_MIN_CHARS } from './search.constants';
import { Portal } from '../components/ui/Portal';

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  minChars?: number;
  onSearchTermChange?: (value: string) => void;
  onCreateNew?: (value: string) => void;
  createLabel?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  onFocus?: () => void;
};

export function AutocompleteSearchInput({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  minChars = SEARCH_MIN_CHARS,
  onSearchTermChange,
  onCreateNew,
  createLabel = 'item',
  disabled = false,
  className,
  required,
  onFocus,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 256; // max-h-64 is 16rem = 256px
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      setCoords({
        top: placeAbove ? rect.top - dropdownHeight - 8 : rect.bottom,
        left: rect.left,
        width: rect.width,
        placeAbove,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to scroll and resize events globally (using capture on scroll to catch bubbling container scroll events)
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  const filtered = useMemo(
    () =>
      options
        .filter((opt) => opt.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 8),
    [options, search],
  );

  const hasExactMatch = options.some(
    (opt) => opt.toLowerCase() === search.trim().toLowerCase(),
  );
  const canCreate = !!onCreateNew && search.trim().length >= minChars && !hasExactMatch;

  const navigableOptions = useMemo(() => {
    const list = [...filtered];
    if (canCreate) {
      list.push(`CREATE:${search}`);
    }
    return list;
  }, [filtered, canCreate, search]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [navigableOptions, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < navigableOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : navigableOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < navigableOptions.length) {
        e.preventDefault();
        const selectedOpt = navigableOptions[highlightedIndex];
        if (selectedOpt !== undefined) {
          if (selectedOpt.startsWith('CREATE:')) {
            onCreateNew?.(search.trim());
          } else {
            onChange(selectedOpt);
            setSearch(selectedOpt);
          }
          setIsOpen(false);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={search}
        className={className ?? 'h-10 text-sm'}
        disabled={disabled}
        required={required}
        onFocus={() => {
          onFocus?.();
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const next = e.target.value;
          setSearch(next);
          onChange(next);
          onSearchTermChange?.(next);
          setIsOpen(true);
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder}
      />
      {isOpen && !disabled && (filtered.length > 0 || canCreate) ? (
        <Portal>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes popoverFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes popoverFadeInAbove {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .popover-animate-below {
              animation: popoverFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .popover-animate-above {
              animation: popoverFadeInAbove 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}} />
          <ul
            style={{
              position: 'fixed',
              top: coords.placeAbove ? `${coords.top}px` : `${coords.top + 4}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className={`z-[1300] max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${
              coords.placeAbove ? 'popover-animate-above' : 'popover-animate-below'
            }`}
          >
            {filtered.map((opt, i) => (
              <li
                key={opt}
                className={`cursor-pointer rounded px-3 py-2 text-xs transition-colors ${
                  highlightedIndex === i ? 'bg-emerald-100 font-semibold text-emerald-900' : 'hover:bg-emerald-50'
                }`}
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </li>
            ))}
            {canCreate ? (
              <li
                className={`cursor-pointer rounded border-t px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors ${
                  highlightedIndex === filtered.length ? 'bg-emerald-100' : 'hover:bg-emerald-50'
                }`}
                onMouseDown={() => {
                  onCreateNew?.(search.trim());
                  setIsOpen(false);
                }}
              >
                Add "{search}" as new {createLabel}
              </li>
            ) : null}
          </ul>
        </Portal>
      ) : null}
    </div>
  );
}
