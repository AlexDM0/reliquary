# eslint

Shared linting configuration for `@reliquary` projects (and anyone else who wants it),
split so non-React projects don't pull React tooling.

| Package | What |
| --- | --- |
| [`@reliquary/eslint-config`](eslint-config) | Framework-agnostic base: TypeScript + stylistic + import hygiene. |
| [`@reliquary/eslint-config-react`](eslint-config-react) | React + Jest + Testing Library layer, composed on top of the base. |

Both are plain ESM flat-config arrays, no build step. The react package lists the base as
a **peer dependency** — you compose them yourself (`[...base, ...react]`); it adds nothing
unless you also install the base.

This monorepo dogfoods them — the root [`eslint.config.mjs`](../../eslint.config.mjs)
composes both.

## Layout

```
packages/eslint/
  eslint-config/         # @reliquary/eslint-config        (base)
  eslint-config-react/   # @reliquary/eslint-config-react  (react layer)
```

See the repo [README](../../README.md) for workspace-wide tooling and commands.

## License

[MIT](../../LICENSE) © Alex de Mulder
