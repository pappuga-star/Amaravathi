import { useEffect, useMemo, useState } from 'react';
import { Input } from '@amaravathi/shared-ui';
import { SEARCH_MIN_CHARS } from './search.constants';

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

  useEffect(() => {
    setSearch(value);
  }, [value]);

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

  return (
    <div className="relative">
      <Input
        value={search}
        className={className ?? 'h-10 text-sm'}
        disabled={disabled}
        required={required}
        onFocus={() => {
          onFocus?.();
          setIsOpen(true);
        }}
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
            <ul className="absolute z-[1300] mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              {filtered.map((opt) => (
                <li
                  key={opt}
                  className="cursor-pointer rounded px-3 py-2 text-xs hover:bg-emerald-50"
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
                  className="cursor-pointer rounded border-t px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  onMouseDown={() => {
                    onCreateNew?.(search.trim());
                    setIsOpen(false);
                  }}
                >
                  Add "{search}" as new {createLabel}
                </li>
              ) : null}
            </ul>
        ) : null}
    </div>
  );
}
