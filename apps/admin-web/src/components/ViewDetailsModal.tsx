import React from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@amaravathi/shared-ui';

export interface ViewField {
  label: string;
  value: any;
  highlighted?: boolean;
  type?: 'text' | 'currency' | 'badge' | 'tags' | 'list' | undefined;
  badgeColor?: 'green' | 'blue' | 'slate' | 'yellow' | 'red' | 'emerald' | 'indigo' | undefined;
}

interface ViewDetailsModalProps {
  title: string;
  subtitle?: string;
  fields: ViewField[];
  onClose: () => void;
  customBody?: React.ReactNode;
}

export function ViewDetailsModal({
  title,
  subtitle,
  fields,
  onClose,
  customBody,
}: ViewDetailsModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'green':
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'blue':
      case 'indigo':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'yellow':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print-backdrop">
      {/* Inject print-specific style rules inline to guarantee standard behavior across browsers */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide everything except the print target */
          body > * {
            display: none !important;
          }
          #printable-modal-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Container with 560px width standard limits */}
      <div
        id="printable-modal-container"
        className="bg-white rounded-xl shadow-xl border border-slate-100 w-full min-w-[320px] max-w-[560px] md:max-w-[560px] max-h-[80vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in duration-150"
      >
        {/* Header */}
        <div className="bg-emerald-800 px-6 py-4 flex items-center justify-between text-white border-b border-emerald-900">
          <div>
            {subtitle && (
              <span className="text-xs uppercase tracking-wider font-mono font-bold text-emerald-300 block mb-0.5">
                {subtitle}
              </span>
            )}
            <h4 className="text-lg font-bold">{title}</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:bg-emerald-700/50 hover:text-white transition-colors no-print"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body with Single-Column Label/Value rows */}
        <div className="p-6 flex-1 flex flex-col gap-4 text-slate-700">
          {fields.map((field, idx) => {
            const isEmpty =
              field.value === undefined ||
              field.value === null ||
              field.value === '';

            return (
              <div
                key={idx}
                className={`flex flex-col gap-1 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0 ${
                  field.highlighted ? 'bg-emerald-50/30 -mx-6 px-6 py-2 border-y border-emerald-100/50' : ''
                }`}
              >
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {field.label}
                </span>

                {isEmpty ? (
                  <span className="text-slate-400 font-medium italic">—</span>
                ) : field.type === 'currency' || field.highlighted ? (
                  <span className="text-lg font-bold text-emerald-800">
                    ₹{Number(field.value).toFixed(2)}/kg
                  </span>
                ) : field.type === 'badge' ? (
                  <span
                    className={`inline-flex w-max items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClass(
                      field.badgeColor
                    )}`}
                  >
                    {field.value}
                  </span>
                ) : field.type === 'tags' && Array.isArray(field.value) ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.value.map((tag: string, tIdx: number) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="font-semibold text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                    {String(field.value)}
                  </span>
                )}
              </div>
            );
          })}

          {customBody && (
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              {customBody}
            </div>
          )}
        </div>

        {/* Footer Buttons with Print and Close */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex flex-wrap gap-2 justify-end no-print">
          <Button
            onClick={handlePrint}
            variant="default"
            className="h-9 text-xs px-4 flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
          >
            <Printer size={14} />
            <span>Print</span>
          </Button>
          <Button
            onClick={onClose}
            variant="secondary"
            className="h-9 text-xs px-4"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
