/**
 * Design Tokens Single Source of Truth (SSOT)
 * Establishes absolute visual, typography, color, and spacing consistency
 * in accordance with WCAG AA accessibility requirements.
 */

export const COLORS = {
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
    placeholder: '#6B7280',
    error: '#DC2626',
    success: '#059669',
  },
  // Background colors
  bg: {
    page: '#F9FAFB',
    card: '#FFFFFF',
    input: '#FFFFFF',
    hover: '#F3F4F6',
    selected: '#EFF6FF',
  },
  // Border colors
  border: {
    default: '#9CA3AF',
    hover: '#6B7280',
    focus: '#2563EB',
    error: '#DC2626',
  },
  // Button colors
  btn: {
    primary: '#2563EB',
    primaryText: '#FFFFFF',
    secondaryBg: '#FFFFFF',
    secondaryBorder: '#9CA3AF',
    danger: '#DC2626',
  },
} as const;

export const TYPOGRAPHY = {
  pageTitle: 'text-[28px] font-bold text-slate-900 leading-tight', // #111827
  sectionTitle: 'text-xl font-semibold text-slate-900', // 20px, #111827
  cardTitle: 'text-lg font-semibold text-slate-900', // 18px, #111827
  fieldLabel: 'text-sm font-semibold text-slate-900', // 14px, #111827
  inputText: 'text-sm font-medium text-slate-900', // 14px, #111827
  placeholderText: 'placeholder:text-slate-500 placeholder:font-normal', // #6B7280
  tableHeader: 'text-sm font-semibold text-slate-900', // 14px, #111827
  tableBody: 'text-sm font-medium text-slate-900', // 14px, #111827
  buttonText: 'text-sm font-semibold', // 14px
  helperText: 'text-xs font-medium text-slate-500', // 12px, #6B7280
  errorText: 'text-xs font-semibold text-red-600', // 12px, #DC2626
} as const;

export const BORDERS = {
  input: 'border border-slate-400 rounded-lg bg-white', // #9CA3AF, 8px radius
  card: 'border border-slate-300 rounded-xl bg-white shadow-sm', // #D1D5DB, 12px radius
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:border-blue-600',
} as const;

export const LAYOUT = {
  inputHeight: 'h-10 md:h-11', // 40-44px
  buttonHeight: 'h-10 md:h-11', // 40-44px
  inputPadding: 'px-3 py-2 md:px-4', // 12px horizontal, 8px vertical
  buttonPadding: 'px-4 py-2.5 md:px-6', // 12px 16px
  cardPadding: 'p-4 md:p-6', // 16-24px
} as const;
