import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { Button } from '@amaravathi/shared-ui';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

interface NotificationContextType {
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  showError: (err: any) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    );
  }
  return context;
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const showError = useCallback(
    (err: any) => {
      let rawMsg = '';
      if (typeof err === 'string') {
        rawMsg = err;
      } else if (err?.message) {
        rawMsg = err.message;
      } else {
        rawMsg = 'An unexpected error occurred.';
      }

      // Convert raw technical Zod / server validation strings into beautiful, business-friendly alerts
      let msg = rawMsg;
      if (
        rawMsg.includes('must contain at least 1 character') ||
        rawMsg.includes('required') ||
        rawMsg.includes('Validation failed')
      ) {
        msg = 'Please complete all required fields.';
      } else if (
        rawMsg.includes('must be greater than 0') ||
        rawMsg.includes('positive')
      ) {
        msg = 'Quantity and price values must be greater than 0.';
      } else if (
        rawMsg.includes('exceeds available stock') ||
        rawMsg.includes('Stock limit exceeded')
      ) {
        msg = 'Requested quantity exceeds available stock.';
      } else if (
        rawMsg.includes('Duplicate ingredients') ||
        rawMsg.includes('duplicate batch')
      ) {
        msg =
          'Duplicate ingredients found. Please resolve duplicate batch and ingredient selections.';
      }

      showToast(msg, 'error');
    },
    [showToast],
  );

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        open: true,
        options: {
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          variant: 'primary',
          ...options,
        },
        resolve: (value) => {
          setConfirmDialog(null);
          resolve(value);
        },
      });
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, showError, confirm }}>
      {children}

      {/* Responsive Toast List */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
        {toasts.map((toast) => {
          const typeClasses = {
            success:
              'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300',
            error:
              'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300',
            warning:
              'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-300',
            info: 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300',
          }[toast.type];

          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertCircle,
            info: Info,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 transform translate-y-0 scale-100 ${typeClasses}`}
              style={{ animation: 'toast-slide-in 0.25s ease-out' }}
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Styled Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  confirmDialog.options.variant === 'danger'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                }`}
              >
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {confirmDialog.options.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => confirmDialog.resolve(false)}
                className="h-9 px-4 text-xs font-semibold"
              >
                {confirmDialog.options.cancelLabel}
              </Button>
              <Button
                variant={
                  confirmDialog.options.variant === 'danger'
                    ? 'delete'
                    : 'default'
                }
                onClick={() => confirmDialog.resolve(true)}
                className={`h-9 px-4 text-xs font-semibold ${
                  confirmDialog.options.variant === 'danger'
                    ? 'bg-rose-600 text-white hover:bg-rose-700 border-transparent shadow-sm'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-sm'
                }`}
              >
                {confirmDialog.options.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
