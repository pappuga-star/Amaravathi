import { clsx } from 'clsx';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
} from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'add' | 'delete' | 'edit' | 'warning' | 'secondary' | 'default';
}

export function Button({
  className,
  variant = 'default',
  ...props
}: ButtonProps) {
  const variantClasses = {
    default: 'hover:bg-slate-50 hover:text-slate-900 border-slate-200',
    add: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border-slate-200',
    delete:
      'hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-slate-200',
    edit: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border-slate-200',
    warning:
      'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border-slate-200',
    secondary:
      'hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 border-slate-200',
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border bg-white text-slate-700 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <section
      className={clsx(
        'rounded-lg border border-slate-200 bg-white p-4 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100',
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  children,
}: PropsWithChildren<{ label: string; error?: string | undefined }>) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}
