# reliquary

A Bun-workspace monorepo collecting my published npm packages, grouped into **families**
under `packages/`. Each family is a directory holding its related packages plus a README
that documents them together; every package is versioned and published independently to
the `@reliquary` npm scope.

## Packages

### [event-bus](packages/event-bus) — a tiny, type-safe event bus

| Package | What |
| --- | --- |
| [`@reliquary/event-bus`](packages/event-bus/event-bus) | Pure-TS core. Zero deps. Ships ESM + CJS with bundled types. |
| [`@reliquary/event-bus-react`](packages/event-bus/event-bus-react) | React 18/19 hooks bound to your bus instance. |

### [eslint](packages/eslint) — shared linting config

| Package | What |
| --- | --- |
| [`@reliquary/eslint-config`](packages/eslint/eslint-config) | Framework-agnostic ESLint 9 flat config (TypeScript + stylistic + imports). Plain ESM, no build. This repo dogfoods it. |
| [`@reliquary/eslint-config-react`](packages/eslint/eslint-config-react) | React + Jest + Testing Library layer, composed on top of the base config. |

## Layout

```
packages/
  event-bus/             # event-bus family
    event-bus/           #   @reliquary/event-bus
    event-bus-react/     #   @reliquary/event-bus-react
    docs/                #   event-bus doc pages (live in the package)
  eslint/                # eslint family
    eslint-config/       #   @reliquary/eslint-config
    eslint-config-react/ #   @reliquary/eslint-config-react
    docs/                #   eslint doc pages (live in the family)
docs/                    # umbrella VitePress shell (config + landing); sources each family's docs/
```

## Documentation

A single VitePress site covers the whole collection: its shell (config + landing page)
lives at `docs/`, while each family's pages live inside its package at
`packages/<family>/docs/` and are pulled into the one site via `srcDir` + `rewrites` in
`docs/.vitepress/config.mts`. Deployed to GitHub Pages on every push to `main`
(`.github/workflows/docs.yml`): **<https://alexdm0.github.io/reliquary/>**.

## Toolchain

- **Bun workspaces** — install, linking, scripts, tests.
- **tsdown** — per-package build → ESM + CJS + paired `.d.mts`/`.d.cts`.
- **Changesets** — versioning & publishing.
- **@arethetypeswrong/cli + publint** — gate the dual-format types.
- **VitePress** — builds `docs/` into the published docs site (Mermaid via `vitepress-plugin-mermaid`).

## Common commands

```sh
bun install
bun run build          # build all packages (event-bus core before react — peer order)
bun run test           # all packages
bun run typecheck
bun run check:exports  # attw + publint on every package
bun run changeset      # record a release intent
bun run docs:dev       # preview the docs site locally
bun run docs:build     # build the docs site (output: docs/.vitepress/dist)
```

## Adding a package

1. Create `packages/<family>/<name>/` with its own `package.json` (named
   `@reliquary/<name>`), a `tsconfig.json` that `extends: ../../../tsconfig.base.json`,
   and a `tsdown.config.ts`.
2. Add a family README at `packages/<family>/README.md` and doc pages under
   `packages/<family>/docs/`, then surface them in the umbrella site with a `rewrites`
   entry in `docs/.vitepress/config.mts`.
3. Run `bun install` to link the new workspace.

## Releasing

Packages are published to npm from a local machine. See [RELEASE.md](RELEASE.md) for
the full flow (`changeset` → `version-packages` → `bun run release`).

## License

[MIT](LICENSE) © Alex de Mulder
