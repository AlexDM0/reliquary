# ESLint config

Shareable [ESLint 9 flat config](https://eslint.org/docs/latest/use/configure/configuration-files)
for `@reliquary` projects, in two packages so a non-React project never installs React
tooling:

| Package | What |
| --- | --- |
| [`@reliquary/eslint-config`](#base-tsjs) | Framework-agnostic base — TypeScript, stylistic and import-hygiene rules. |
| [`@reliquary/eslint-config-react`](#react-layer) | React + Jest + Testing Library layer, composed on top of the base. |

Both ship as plain ESM flat-config arrays with **no build step** — their `index.js` is the
published file. Each plugin is a regular runtime `dependency`, so installing a package
pulls everything it needs; `eslint` (`^9`) is a peer dependency.

## Install

For a plain TypeScript/JavaScript project:

```sh
bun add -D @reliquary/eslint-config eslint
```

For a React project, add the layer:

```sh
bun add -D @reliquary/eslint-config @reliquary/eslint-config-react eslint
```

(`npm i -D …` / `pnpm add -D …` work the same.)

## Base (TS/JS)

`@reliquary/eslint-config` is safe for any TS/JS codebase — Node, browser, or library.
Point your `eslint.config.mjs` at the default export:

```js
import config from '@reliquary/eslint-config';

export default config;
```

It targets `**/*.{js,mjs,cjs,ts,tsx}`, ignores `dist/` and `node_modules/`, and registers:

| Plugins | Highlights |
| --- | --- |
| `typescript-eslint`, `@stylistic`, `import`, `import-newlines`, `align-import`, `align-assignments`, `unused-imports` | 2-space indent, single quotes, semicolons, value-aligned key spacing, `import/order` (alphabetized), `no-explicit-any`, `no-unused-imports` |

## React layer

`@reliquary/eslint-config-react` adds React, Jest and Testing Library rules and nothing
else — no parser, globals or ignores. It is meant to be **composed on top of the base**,
which it declares as a peer dependency:

```js
import base  from '@reliquary/eslint-config';
import react from '@reliquary/eslint-config-react';

export default [
  ...base,
  ...react,
];
```

| Plugins | Highlights |
| --- | --- |
| `react`, `jest`, `testing-library` | relaxed React prop rules, `jest/no-disabled-tests`, `testing-library/prefer-screen-queries`, React version auto-detected |

## Composing overrides

Every export is a flat-config array, so append your own config objects after the spreads —
later entries win:

```js
import base  from '@reliquary/eslint-config';
import react from '@reliquary/eslint-config-react';

export default [
  ...base,
  ...react,
  {
    rules: {
      '@stylistic/max-len':            ['error', { code: 120 }],
      'react/jsx-no-useless-fragment': 'error',
    },
  },
  {
    // narrow a rule to a file subset
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
];
```

## How the monorepo uses it

This repo dogfoods both packages — the root [`eslint.config.mjs`](https://github.com/AlexDM0/reliquary/blob/main/eslint.config.mjs)
spreads `base` then `react`, and `bun run lint` lints every package through it.
