import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

const eslintRecommended = eslint.configs.recommended;
const eslintPluginTypeScriptRecommended = tseslint.configs.recommended;

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'package*.json', 'example/lettercrap.min.*'],
  },
  eslintRecommended,
  ...eslintPluginTypeScriptRecommended,
  eslintPluginPrettierRecommended,
  {
    plugins: { '@typescript-eslint': typescriptEslint },
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
