# @reliquary/eslint-config-react

The React layer for [`@reliquary/eslint-config`](../eslint-config) — React, Jest and
Testing Library rules as an [ESLint 9 flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
array. Plain ESM, no build step.

Keep it separate so non-React projects never pull React/testing plugins: install
`@reliquary/eslint-config` alone for a plain TS/JS project, and add this package only when
you have React.

## Install

```sh
bun add -D @reliquary/eslint-config @reliquary/eslint-config-react eslint
# or: npm i -D @reliquary/eslint-config @reliquary/eslint-config-react eslint
```

`@reliquary/eslint-config` and `eslint` (`^9`) are peer dependencies — this package layers
on top of the base config.

## Usage

In your `eslint.config.mjs`, compose the base config with this layer:

```js
import base  from '@reliquary/eslint-config';
import react from '@reliquary/eslint-config-react';

export default [
  ...base,
  ...react,
];
```

Both default exports are flat-config arrays, so you can splice in your own overrides after
them:

```js
import base  from '@reliquary/eslint-config';
import react from '@reliquary/eslint-config-react';

export default [
  ...base,
  ...react,
  {
    rules: {
      'react/jsx-no-useless-fragment': 'error',
    },
  },
];
```

## What's in it

| Plugins | Highlights |
| --- | --- |
| `react`, `jest`, `testing-library` | relaxed React prop rules, `jest/no-disabled-tests`, `testing-library/prefer-screen-queries`, React version auto-detected |

Targets `**/*.{js,mjs,cjs,ts,tsx}`. It does **not** set parser, globals or ignores — those
come from `@reliquary/eslint-config`, which you must compose first.

## License

[MIT](./LICENSE) © Alex de Mulder
