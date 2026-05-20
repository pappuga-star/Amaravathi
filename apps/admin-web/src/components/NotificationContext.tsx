import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { AccessibleIconButton, Button } from '@amaravathi/shared-ui';
import { Portal } from './ui/Portal';
import { Z_INDEX } from '../constants/zIndex';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  action?: ToastAction;
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
    options?: {
      title?: string;
      action?: ToastAction;
    },
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
      options?: {
        title?: string;
        action?: ToastAction;
      },
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type, ...options }]);
      const timeoutMs = options?.action ? 8000 : 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeoutMs);
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
      <Portal>
      <div
        className="fixed bottom-4 right-4 flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0"
        style={{ zIndex: Z_INDEX.toast }}
      >
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
              <div className="flex-1 flex flex-col gap-1 text-sm font-medium leading-relaxed">
                {toast.title && <div className="font-bold text-slate-900 dark:text-slate-100">{toast.title}</div>}
                <div className={toast.title ? 'text-xs text-slate-600 dark:text-slate-400 font-medium' : ''}>{toast.message}</div>
                {toast.action && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className={`mt-2 w-max inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-bold rounded shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      toast.type === 'warning'
                        ? 'text-amber-950 bg-amber-100 hover:bg-amber-200 focus:ring-amber-500'
                        : 'text-rose-950 bg-rose-100 hover:bg-rose-200 focus:ring-rose-500'
                    }`}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <AccessibleIconButton
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-0.5"
                label="Close notification"
              >
                <X className="h-4 w-4" />
              </AccessibleIconButton>
            </div>
          );
        })}
      </div>
      </Portal>

      {/* Styled Confirmation Modal */}
      {confirmDialog && (
        <Portal>
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          style={{ zIndex: Z_INDEX.modalBackdrop }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: Z_INDEX.modal }}
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
              <button
                onClick={() => confirmDialog.resolve(true)}
                className={`inline-flex items-center justify-center h-9 px-4 rounded-md border text-xs font-semibold shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  confirmDialog.options.variant === 'danger'
                    ? 'bg-rose-600 text-white hover:bg-rose-700 border-transparent focus:ring-rose-500'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent focus:ring-emerald-500'
                }`}
              >
                {confirmDialog.options.confirmLabel}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </NotificationContext.Provider>
  );
}
