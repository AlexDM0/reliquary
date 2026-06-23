# Releasing

How to cut a release of the `@reliquary` packages:

- **event-bus family** — `@reliquary/event-bus`, then `@reliquary/event-bus-react` (peers on core).
- **eslint family** — `@reliquary/eslint-config`, then `@reliquary/eslint-config-react` (peers on the base config).

Releases are published **from a local machine** (there is no CI publish workflow).

## Prerequisites

- Membership of the `@reliquary` npm org with publish rights.
- Logged in to npm: `bunx npm login`.
- npm auth that does **not** require a per-publish one-time password, so the single
  `bun run release:all` command can publish all four packages unattended through the
  guarded flow. Either set the account's 2FA to *authorization* only (not *authorization
  and writes*), or authenticate with a granular/automation access token.
- A clean `main` with your changes committed.

## 1. Record changes

For every change that should appear in a release, add a changeset:

```sh
bun run changeset
```

Pick the affected package(s) and bump type (patch / minor / major), write a short
summary, and commit the generated `.changeset/*.md` file.

## 2. Version

```sh
bun run version-packages
```

This consumes the changesets, bumps versions, and writes each package's
`CHANGELOG.md`. Review the diff and commit it.

## 3. Publish

```sh
bun run release:all
```

This first runs `bun run verify` — the full stability gate across **all** packages
(`build → typecheck → lint → test → check:exports`, the last being attw + publint). A
failure anywhere aborts before *any* package is published. Only then does it publish all
four with `bun publish` in dependency order: `@reliquary/event-bus` →
`@reliquary/event-bus-react`, then `@reliquary/eslint-config` →
`@reliquary/eslint-config-react`. `bun publish` rewrites the `workspace:` protocol to the
real version (e.g. `workspace:^` → `^1.0.0`), and each package's
`publishConfig.access: "public"` publishes the scoped packages publicly.

### Releasing a single package

To publish just one package, use its per-package script. Each runs the **same** full
`verify` gate first, so a single-package release is held to the identical bar:

```sh
bun run release:event-bus
bun run release:event-bus-react
bun run release:eslint-config
bun run release:eslint-config-react
```

Releasing a dependent package alone (`event-bus-react`, `eslint-config-react`) assumes the
base package it peers on is already published at a matching version.

Each package's `release:npm` script tags its release after a successful publish with an
annotated tag named `<package>@<version>` (e.g. `@reliquary/event-bus@1.0.0`), so you can
`git checkout` the exact repo state behind any single package's release. Tags are created
**locally** — push them once the release looks good:

```sh
git push --follow-tags
```

The root `release:*` scripts (`bun run release:all` and the per-package `release:event-bus`
etc.) are the only sanctioned publish paths — each runs the full `verify` gate, the
dependency order, and the per-package tagging together. A package's own `release:npm` is
**guarded**: it refuses to run unless invoked through a root `release:*` script (which sets
the `RELIQUARY_RELEASE` env var), so `bun publish`-by-hand and direct `release:npm` calls
both fail fast. Don't try to bypass it; that skips the gate and the ordering.

## 4. Verify

```sh
npm view @reliquary/event-bus
npm view @reliquary/event-bus-react
npm view @reliquary/eslint-config
npm view @reliquary/eslint-config-react
bunx @arethetypeswrong/cli @reliquary/event-bus
bunx @arethetypeswrong/cli @reliquary/event-bus-react
```

## Notes

- The event-bus packages build to `dist/` (gitignored, `files: ["dist"]`), so they must be
  built before publishing — `bun run release:all` handles this. The eslint packages have no
  build step (they ship `index.js` directly).
- Publish order matters: each family's base package must publish before the package that
  peers on it (`event-bus` before `event-bus-react`, `eslint-config` before
  `eslint-config-react`). The `release:all` script enforces the order.
- Tags are created locally per published package (`<package>@<version>`) and are not
  pushed automatically — run `git push --follow-tags` once the release looks good. A failed
  tag (e.g. it already exists) halts the chained `release:all` run before the next package.
