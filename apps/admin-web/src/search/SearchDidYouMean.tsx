export function SearchDidYouMean({ suggestion, onSelect }: { suggestion?: string; onSelect: (value: string) => void }) {
  if (!suggestion) return null;
  return (
    <p className="text-sm text-slate-600">
      Did you mean{' '}
      <button type="button" onClick={() => onSelect(suggestion)} className="font-semibold text-emerald-700 underline">
        {suggestion}
      </button>
      ?
    </p>
  );
}
