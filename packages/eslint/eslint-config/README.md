# @reliquary/eslint-config

Shareable, **framework-agnostic** [ESLint 9 flat config](https://eslint.org/docs/latest/use/configure/configuration-files):
TypeScript + stylistic + import-hygiene rules, safe for any TS/JS project (Node, browser,
library).

Plain ESM with no build step; the plugins it needs are regular `dependencies`, so
installing this package pulls everything in. For React projects, add the companion
[`@reliquary/eslint-config-react`](../eslint-config-react) layer — keeping it separate
means non-React projects never install React/testing plugins.

## Install

```sh
bun add -D @reliquary/eslint-config eslint
# or: npm i -D @reliquary/eslint-config eslint
```

`eslint` is a peer dependency — install the version your project uses (`^9`).

## Usage

Create an `eslint.config.mjs` at your project root:

```js
import config from '@reliquary/eslint-config';

export default config;
```

The default export is a flat-config array, so you can splice in your own overrides:

```js
import base from '@reliquary/eslint-config';

export default [
  ...base,
  {
    rules: {
      '@stylistic/max-len': ['error', { code: 120 }],
    },
  },
];
```

For React, compose the React layer on top:

```js
import base  from '@reliquary/eslint-config';
import react from '@reliquary/eslint-config-react';

export default [
  ...base,
  ...react,
];
```

## What's in it

| Plugins | Highlights |
| --- | --- |
| `typescript-eslint`, `@stylistic`, `import`, `import-newlines`, `align-import`, `align-assignments`, `unused-imports` | 2-space indent, single quotes, semicolons, value-aligned key spacing, `import/order` (alphabetized), `no-explicit-any`, `no-unused-imports` |

Targets `**/*.{js,mjs,cjs,ts,tsx}` and ignores `dist/` and `node_modules/`.

## License

[MIT](./LICENSE) © Alex de Mulder
