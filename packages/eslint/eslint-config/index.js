import stylistic              from '@stylistic/eslint-plugin';
import alignAssignmentsPlugin from 'eslint-plugin-align-assignments';
import alignImportPlugin      from 'eslint-plugin-align-import';
import importPlugin           from 'eslint-plugin-import';
import importNewlinesPlugin   from 'eslint-plugin-import-newlines';
import unusedImportsPlugin    from 'eslint-plugin-unused-imports';
import globals                from 'globals';
import tseslint               from 'typescript-eslint';

const FILES = ['**/*.{js,mjs,cjs,ts,tsx}'];

/**
 * Base config: TypeScript + stylistic + import hygiene. No framework or test
 * rules — safe for any TS/JS project. For React projects, compose
 * `@reliquary/eslint-config-react` on top of this.
 */
export const base = tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'], },
  {
    files:           FILES,
    languageOptions: {
      parser:        tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType:  'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic':         stylistic,
      'align-assignments':  alignAssignmentsPlugin,
      'align-import':       alignImportPlugin,
      'import-newlines':    importNewlinesPlugin,
      'unused-imports':     unusedImportsPlugin,
      'import':             importPlugin,
    },
    rules: {
      // ----------------------------------------------------------------------
      // Stylistic (formatting)
      // ----------------------------------------------------------------------
      '@stylistic/indent':                  ['error', 2],
      '@stylistic/linebreak-style':         ['error', process.platform === 'win32' ? 'windows' : 'unix'],
      '@stylistic/quotes':                  ['error', 'single'],
      '@stylistic/semi':                    ['error', 'always'],
      '@stylistic/key-spacing':             ['error', { mode: 'strict', align: 'value' }],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 2, maxEOF: 0 }],
      '@stylistic/no-multi-spaces':         'off',
      '@stylistic/object-curly-newline':    ['error', {
        ObjectExpression: { multiline: true, minProperties: 4 },
        ObjectPattern:    { multiline: true, minProperties: 4 },
      }],
      '@stylistic/object-property-newline':         ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/array-element-newline':           ['error', 'consistent'],
      '@stylistic/max-len':                         ['error', { code: 180, comments: 155 }],
      '@stylistic/comma-spacing':                   ['error', { before: false, after: true }],
      '@stylistic/object-curly-spacing':            ['error', 'always'],
      '@stylistic/block-spacing':                   ['error', 'always'],
      '@stylistic/space-infix-ops':                 'error',
      '@stylistic/arrow-parens':                    ['error', 'always'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'function' },
      ],
      '@stylistic/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],

      // ----------------------------------------------------------------------
      // TypeScript
      // ----------------------------------------------------------------------
      '@typescript-eslint/no-explicit-any':             'error',
      '@typescript-eslint/no-var-requires':             'off',
      '@typescript-eslint/no-empty-function':           'off',
      '@typescript-eslint/no-use-before-define':        'off',
      '@typescript-eslint/indent':                      'off',
      '@typescript-eslint/lines-between-class-members': 'off',
      '@typescript-eslint/ban-ts-comment':              'off',

      // ----------------------------------------------------------------------
      // Core JS
      // ----------------------------------------------------------------------
      'guard-for-in':           'off',
      'prefer-destructuring':   ['error', { object: true, array: false }],
      'no-param-reassign':      'off',
      'consistent-return':      'off',
      'max-classes-per-file':   ['error', 5],
      'class-methods-use-this': 'off',
      'no-restricted-syntax':   'off',
      'no-await-in-loop':       'off',
      'no-void':                'off',
      'global-require':         'off',
      'no-plusplus':            'off',
      'no-continue':            'off',
      'object-shorthand':       ['error', 'always'],

      // ----------------------------------------------------------------------
      // Imports
      // ----------------------------------------------------------------------
      'import/prefer-default-export':      'off',
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/*.e2e.ts',
          '**/*.setup.ts',
          '**/*.mock.ts',
          '**/*.config.ts',
          '**/*.config.mjs',
          '**/happydom.ts',
        ],
      }],
      'import/order': [
        'error',
        {
          pathGroups: [
            {
              pattern:  '@ae/**',
              group:    'external',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize:                   { order: 'asc' },
        },
      ],
      'align-import/align-import':        'error',
      'import-newlines/enforce':          ['error', { items: 3, 'max-len': 180, semi: true }],
      'unused-imports/no-unused-imports': 'error',
    },
  },
);

export default base;
