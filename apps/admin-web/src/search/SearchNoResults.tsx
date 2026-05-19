import { SearchDidYouMean } from './SearchDidYouMean';

export function SearchNoResults({
  query,
  didYouMean,
  alternatives,
  onSelect,
}: {
  query: string;
  didYouMean?: string;
  alternatives: string[];
  onSelect: (value: string) => void;
}) {
  const didYouMeanProps = didYouMean ? { suggestion: didYouMean } : {};
  return (
    <div className="text-center py-16 text-slate-400 dark:text-slate-500">
      <p className="text-sm font-semibold">No matches found for "{query}"</p>
      <div className="mt-2">
        <SearchDidYouMean {...didYouMeanProps} onSelect={onSelect} />
      </div>
      {alternatives.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {alternatives.map((term) => (
            <button key={term} type="button" onClick={() => onSelect(term)} className="rounded-full border px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100">
              {term}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
