import { clsx } from 'clsx';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type PropsWithChildren,
} from 'react';
import { BORDERS, LAYOUT, TYPOGRAPHY } from './design-tokens';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'add' | 'delete' | 'edit' | 'warning' | 'secondary' | 'default';
}

export interface AccessibleIconButtonProps extends ButtonProps {
  label: string;
  tooltipClassName?: string;
  wrapperClassName?: string;
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}

export function Button({
  className,
  variant = 'default',
  ...props
}: ButtonProps) {
  const variantClasses = {
    default: 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50 hover:border-slate-400',
    secondary: 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 hover:border-slate-400',
    add: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm focus:ring-blue-600',
    delete: 'bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 shadow-sm focus:ring-red-600',
    edit: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 hover:text-blue-900 hover:border-blue-300',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300',
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        LAYOUT.buttonHeight,
        LAYOUT.buttonPadding,
        TYPOGRAPHY.buttonText,
        BORDERS.focusRing,
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AccessibleIconButton({
  label,
  children,
  className,
  tooltipClassName,
  wrapperClassName,
  tooltipPosition = 'top',
  ...props
}: AccessibleIconButtonProps) {
  const tooltipPositionClasses = {
    top: '-top-9 left-1/2 -translate-x-1/2',
    right: 'left-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2',
    bottom: '-bottom-9 left-1/2 -translate-x-1/2',
    left: 'right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2',
  };

  return (
    <span className={clsx('relative inline-flex group', wrapperClassName)}>
      <button
        {...props}
        className={clsx(BORDERS.focusRing, 'rounded-md', className)}
        aria-label={label}
        title={label}
      >
        {children}
      </button>
      <span
        className={clsx(
          'pointer-events-none absolute whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          tooltipPositionClasses[tooltipPosition],
          tooltipClassName,
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function Card({
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <section
      className={clsx(
        'bg-white shadow-sm transition-shadow duration-200',
        BORDERS.card,
        LAYOUT.cardPadding,
        className,
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full bg-white outline-none transition disabled:opacity-50 disabled:cursor-not-allowed',
          LAYOUT.inputHeight,
          LAYOUT.inputPadding,
          TYPOGRAPHY.inputText,
          TYPOGRAPHY.placeholderText,
          BORDERS.input,
          BORDERS.focusRing,
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={clsx(
          'w-full bg-white outline-none transition disabled:opacity-50 disabled:cursor-not-allowed',
          LAYOUT.inputHeight,
          LAYOUT.inputPadding,
          TYPOGRAPHY.inputText,
          BORDERS.input,
          BORDERS.focusRing,
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          'w-full bg-white outline-none transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px]',
          LAYOUT.inputPadding,
          TYPOGRAPHY.inputText,
          TYPOGRAPHY.placeholderText,
          BORDERS.input,
          BORDERS.focusRing,
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

export function Field({
  label,
  error,
  children,
}: PropsWithChildren<{ label: string; error?: string | undefined }>) {
  return (
    <label className="grid gap-1.5 w-full">
      <span className={clsx(TYPOGRAPHY.fieldLabel)}>{label}</span>
      {children}
      {error ? (
        <span className={clsx(TYPOGRAPHY.errorText)}>{error}</span>
      ) : null}
    </label>
  );
}
