import type { SearchSuggestion } from './useSearchSuggestions';

export function SearchSuggestionsDropdown({
  suggestions,
  onSelect,
}: {
  suggestions: SearchSuggestion[];
  onSelect: (value: string) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Suggestions</div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={`${s.type}-${s.text}`}
            type="button"
            onClick={() => onSelect(s.text)}
            className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
