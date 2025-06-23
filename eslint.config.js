import eslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import htmlPlugin from 'eslint-plugin-html';
import tseslint from 'typescript-eslint';

const statementTypes = [
  'return',
  'break',
  'continue',
  'throw',
  'try',
  'function',
  'if',
  'switch',
  'for',
  'while',
  'do',
  'block',
  'class',
  'export',
];

export default tseslint.config(
  {
    ignores: ['./dist/*', './node_modules/*', './wrangler/*', './*.config.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.app.json', './tsconfig.worker.json', './tsconfig.node.json'],
        },
      },
      'import/core-modules': ['cloudflare:workers'],
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': [
        'error',
        {
          allowArgumentsExplicitlyTypedAsAny: false,
          allowDirectConstAssertionInArrowFunctions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
      '@typescript-eslint/parameter-properties': 'error',
      '@typescript-eslint/no-unused-vars': [
        process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/explicit-member-accessibility': 'error',
      curly: 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
          'newlines-between': 'never',
        },
      ],
      'import/no-unresolved': 'error',
      'max-len': [
        2,
        120,
        2,
        {
          ignoreComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-empty': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-ternary': 'error',
      'padding-line-between-statements': [
        'error',
        ...statementTypes.map(statementType => ({
          blankLine: 'always',
          prev: '*',
          next: statementType,
        })),
        ...statementTypes.map(statementType => ({
          blankLine: 'always',
          prev: statementType,
          next: '*',
        })),
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['**/*.html', 'index.html'],
    plugins: {
      html: htmlPlugin,
    },
    rules: {
      // ...
    },
  },
);
