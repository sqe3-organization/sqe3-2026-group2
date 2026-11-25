const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'labs/**', 'logs/**', 'reports/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['core/**/*.ts', 'main/**/*.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Logger is the dedicated console wrapper in the Core Layer
    files: ['core/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Relax explicit-any slightly inside test files when asserting dynamic API responses
    files: ['tests/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  eslintConfigPrettier
);
