import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { accessibilityRulesPlugin } from './eslint/accessibility-rules.mjs';

export default tseslint.config(
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      '**/scratch/',
      '**/*.scratch.*',
      '**/scratch.*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      'no-duplicate-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['apps/admin-web/src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      accessibility: accessibilityRulesPlugin,
    },
    rules: {
      'accessibility/no-raw-icon-only-buttons': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../components/NotificationContext', './NotificationContext', '../../components/NotificationContext', 'src/components/NotificationContext'],
              message:
                "Use '@/components/NotificationContext' as the only allowed import path.",
            },
          ],
        },
      ],
    },
  },
);
