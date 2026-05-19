import { Search, Loader2, X } from 'lucide-react';
import { AccessibleIconButton, Input } from '@amaravathi/shared-ui';

type SearchInputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  className?: string;
};

export function SearchInput({
  label,
  placeholder = 'Search...',
  value,
  onChange,
  loading = false,
  className,
}: SearchInputProps) {
  return (
    <label className={`relative block ${className || ''}`}>
      {label ? <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span> : null}
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 pr-8 text-xs"
      />
      {loading ? (
        <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
      ) : value ? (
        <AccessibleIconButton
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          label="Clear search"
        >
          <X size={12} />
        </AccessibleIconButton>
      ) : null}
    </label>
  );
}
