import React from 'react';
import { X, Printer, Edit3 } from 'lucide-react';
import { AccessibleIconButton, Button } from '@amaravathi/shared-ui';
import { Portal } from './ui/Portal';
import { Z_INDEX } from '../constants/zIndex';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export interface ViewField {
  label: string;
  value: any;
  highlighted?: boolean;
  type?: 'text' | 'currency' | 'badge' | 'tags' | 'list' | undefined;
  badgeColor?:
    | 'green'
    | 'blue'
    | 'slate'
    | 'yellow'
    | 'red'
    | 'emerald'
    | 'indigo'
    | undefined;
}

interface ViewDetailsModalProps {
  title: string;
  subtitle?: string;
  fields: ViewField[];
  onClose: () => void;
  customBody?: React.ReactNode;
  headerMeta?: React.ReactNode;
  isFormula?: boolean;
  onEdit?: () => void;
}

export function ViewDetailsModal({
  title,
  subtitle,
  fields,
  onClose,
  customBody,
  headerMeta,
  isFormula = false,
  onEdit,
}: ViewDetailsModalProps) {
  useBodyScrollLock(true);
  useEscapeKey(true, onClose);

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
    <Portal>
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print-backdrop"
      style={{ zIndex: Z_INDEX.modalBackdrop }}
    >
      {/* Inject print-specific style rules inline to guarantee standard behavior across browsers */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide non-modal content from print view seamlessly */
          body * {
            visibility: hidden;
          }
          #printable-modal-container, #printable-modal-container * {
            visibility: visible;
          }
          #printable-modal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Container with 560px width standard limits */}
      <div
        id="printable-modal-container"
        className="bg-white rounded-xl shadow-xl border border-slate-100 w-full min-w-[320px] max-w-[560px] md:max-w-[560px] max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150"
        style={{ zIndex: Z_INDEX.modal }}
      >
        {/* Header */}
        <div className="bg-emerald-800 px-6 py-4 flex items-center justify-between text-white border-b border-emerald-900">
          <div>
            {isFormula ? (
              <>
                <h4 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                  {(() => {
                    const rawSub = subtitle || '';
                    return rawSub.replace(/^Customer:\s*/i, '');
                  })()}
                </h4>
                <span className="text-xs uppercase tracking-widest font-mono font-bold text-emerald-300 block mt-1">
                  {(() => {
                    const rawTitle = title || '';
                    return rawTitle.replace(/^Formula:\s*/i, '');
                  })()}
                </span>
              </>
            ) : (
              <>
                {subtitle && (
                  <span className="text-xs uppercase tracking-wider font-mono font-bold text-emerald-300 block mb-0.5">
                    {subtitle}
                  </span>
                )}
                <h4 className="text-lg font-bold">{title}</h4>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {headerMeta && <div className="hidden sm:flex items-center gap-2 no-print">{headerMeta}</div>}
            <AccessibleIconButton
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:bg-emerald-700/50 hover:text-white transition-colors no-print"
              label="Close dialog"
            >
              <X size={20} />
            </AccessibleIconButton>
          </div>
        </div>

        {/* Content Body with Single-Column Label/Value rows */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4 text-slate-700">
          {isFormula ? (
            <div className="flex flex-col gap-4">
              {/* 4 Premium Metric Grid Boxes */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Total Weight Box */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 flex flex-col gap-1 shadow-sm hover:shadow-md transition duration-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {fields[0]?.label || 'Total Weight'}
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {(() => {
                      const val = String(fields[0]?.value || '0');
                      return val.endsWith('g') ? val : `${val}g`;
                    })()}
                  </span>
                </div>

                {/* Total Cost Box */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 flex flex-col gap-1 shadow-sm hover:shadow-md transition duration-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {fields[1]?.label || 'Total Cost'}
                  </span>
                  <span className="text-base font-bold text-slate-850">
                    {(() => {
                      const val = fields[1]?.value;
                      const cleanVal = typeof val === 'string' ? val.replace(/[₹\s,]/g, '') : val;
                      const num = Number(cleanVal);
                      return isNaN(num) ? String(val || '—') : `₹${num.toFixed(2)}`;
                    })()}
                  </span>
                </div>

                {/* Cost Per Gram Box */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 flex flex-col gap-1 shadow-sm hover:shadow-md transition duration-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {fields[2]?.label || 'Cost Per Gram'}
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {(() => {
                      const val = fields[2]?.value;
                      const cleanVal = typeof val === 'string' ? val.replace(/[₹\s,/g]/g, '') : val;
                      const num = Number(cleanVal);
                      return isNaN(num) ? String(val || '—') : `₹${num.toFixed(4)}/g`;
                    })()}
                  </span>
                </div>

                {/* Cost Per KG Box */}
                <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 flex flex-col gap-1 shadow-sm hover:shadow-md transition duration-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    {fields[3]?.label || 'Cost Per KG'}
                  </span>
                  <span className="text-base font-extrabold text-emerald-800">
                    {(() => {
                      const val = fields[3]?.value;
                      const cleanVal = typeof val === 'string' ? val.replace(/[₹\s,/kg]/g, '') : val;
                      const num = Number(cleanVal);
                      return isNaN(num) ? String(val || '—') : `₹${num.toFixed(2)}/kg`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Notes Full Width Box */}
              {fields[4] && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col gap-1 shadow-sm hover:shadow-md transition duration-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {fields[4].label}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                    {fields[4].value || '—'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            fields.map((field, idx) => {
              const isEmpty =
                field.value === undefined ||
                field.value === null ||
                field.value === '';

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0 ${
                    field.highlighted
                      ? 'bg-emerald-50/30 -mx-6 px-6 py-2 border-y border-emerald-100/50'
                      : ''
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {field.label}
                  </span>

                  {isEmpty ? (
                    <span className="text-slate-400 font-medium italic">—</span>
                  ) : field.type === 'currency' || field.highlighted ? (
                    <span className="text-lg font-bold text-emerald-800">
                      {(() => {
                        const cleanVal = typeof field.value === 'string'
                          ? field.value.replace(/[₹\s,]/g, '')
                          : field.value;
                        const num = Number(cleanVal);
                        return isNaN(num) ? String(field.value) : `₹${num.toFixed(2)}/kg`;
                      })()}
                    </span>
                  ) : field.type === 'badge' ? (
                    <span
                      className={`inline-flex w-max items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClass(
                        field.badgeColor,
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
            })
          )}

          {customBody && (
            <div className={`${fields.length > 0 ? 'border-t border-slate-100 pt-4' : ''} flex flex-col gap-3`}>
              {customBody}
            </div>
          )}
        </div>

        {/* Footer Buttons with Print, Edit and Close */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex flex-wrap gap-2 justify-end no-print">
          {onEdit && (
            <Button
              onClick={onEdit}
              variant="add"
              className="h-9 text-xs px-4 flex items-center gap-1.5"
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </Button>
          )}
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
    </Portal>
  );
}
