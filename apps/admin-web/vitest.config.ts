import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'tests/e2e/**',
      '**/*.e2e.spec.*',
      'node_modules',
      'dist',
      'build',
    ],
  },
});

