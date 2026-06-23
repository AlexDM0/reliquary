# Releasing

How to cut a release of `@reliquary/event-bus` and `@reliquary/event-bus-react`. Releases are
published **from a local machine** (there is no CI publish workflow).

## Prerequisites

- Membership of the `@reliquary` npm org with publish rights.
- Logged in to npm: `bunx npm login`.
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

> **Pre-1.0 caveat.** While `@reliquary/event-bus` is below `1.0.0`, a *minor* bump to it
> makes changesets want to *major*-bump `@reliquary/event-bus-react` — a `^0.x` peer range
> cannot absorb a `0.x` minor, so it is treated as breaking. After versioning, check
> react's version and correct it to match if needed. This stops once core reaches
> `1.0.0` (the config sets `onlyUpdatePeerDependentsWhenOutOfRange`).

## 3. Publish

```sh
bun run release
```

This builds both packages, then publishes **core first, then react** with
`bun publish`. `bun publish` rewrites the `workspace:` protocol to the real version
(e.g. `workspace:^` → `^0.2.0`), and `publishConfig.access: "public"` publishes the
scoped packages publicly.

If your npm account requires a one-time password, publish the two manually:

```sh
bun run build
cd packages/event-bus/event-bus       && bun publish --otp=<code> && cd -
cd packages/event-bus/event-bus-react && bun publish --otp=<code> && cd -
```

## 4. Verify

```sh
npm view @reliquary/event-bus
npm view @reliquary/event-bus-react
bunx @arethetypeswrong/cli @reliquary/event-bus
bunx @arethetypeswrong/cli @reliquary/event-bus-react
```

## Notes

- `dist/` is gitignored and `files: ["dist"]`, so packages must be built before
  publishing — `bun run release` handles this.
- Core must publish before react (peer dependency); the `release` script enforces the
  order.
- Publishing does not require a Git tag; tag and push however you prefer.
