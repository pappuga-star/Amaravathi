import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/shared-ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          700: '#047857',
          900: '#064e3b',
        },
        // Semantic design system colors
        'text-primary': '#111827',
        'text-secondary': '#374151',
        'text-muted': '#6B7280',
        'text-placeholder': '#6B7280',
        'text-error': '#DC2626',
        'text-success': '#059669',
        
        'bg-page': '#F9FAFB',
        'bg-card': '#FFFFFF',
        'bg-input': '#FFFFFF',
        'bg-hover': '#F3F4F6',
        'bg-selected': '#EFF6FF',
        
        'border-default': '#9CA3AF',
        'border-hover': '#6B7280',
        'border-focus': '#2563EB',
        'border-error': '#DC2626',
        
        'btn-primary': '#2563EB',
        'btn-danger': '#DC2626',
      },
    },
  },
  plugins: [],
} satisfies Config;
