import jestPlugin           from 'eslint-plugin-jest';
import reactPlugin          from 'eslint-plugin-react';
import testingLibraryPlugin from 'eslint-plugin-testing-library';

const FILES = ['**/*.{js,mjs,cjs,ts,tsx}'];

/**
 * React layer: React + Jest + Testing Library rules. Compose on top of
 * `@reliquary/eslint-config` — e.g. `export default [...base, ...react]`.
 */
export const react = [
  {
    files:    FILES,
    settings: { react: { version: 'detect' } },
    plugins:  {
      'react':           reactPlugin,
      'testing-library': testingLibraryPlugin,
      'jest':            jestPlugin,
    },
    rules: {
      // React
      'react/jsx-props-no-spreading':   'off',
      'react/destructuring-assignment': 'off',
      'react/require-default-props':    'off',
      'react/jsx-no-useless-fragment':  'off',
      'react/no-unused-prop-types':     'off',

      // Testing
      'jest/no-disabled-tests':                'error',
      'testing-library/prefer-screen-queries': 'error',
    },
  },
];

export default react;
