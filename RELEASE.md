# Releasing

How to cut a release of the `@reliquary` packages:

- **event-bus family** — `@reliquary/event-bus`, then `@reliquary/event-bus-react` (peers on core).
- **eslint family** — `@reliquary/eslint-config`, then `@reliquary/eslint-config-react` (peers on the base config).

Releases are published **from a local machine** (there is no CI publish workflow).

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

## 3. Publish

```sh
bun run release
```

This builds the event-bus packages, then publishes all four with `bun publish` in
dependency order: `@reliquary/event-bus` → `@reliquary/event-bus-react`, then
`@reliquary/eslint-config` → `@reliquary/eslint-config-react`. `bun publish` rewrites the
`workspace:` protocol to the real version (e.g. `workspace:^` → `^1.0.0`), and each
package's `publishConfig.access: "public"` publishes the scoped packages publicly.

If your npm account requires a one-time password, publish them manually in the same order:

```sh
bun run build
cd packages/event-bus/event-bus        && bun publish --otp=<code> && cd -
cd packages/event-bus/event-bus-react  && bun publish --otp=<code> && cd -
cd packages/eslint/eslint-config       && bun publish --otp=<code> && cd -
cd packages/eslint/eslint-config-react && bun publish --otp=<code> && cd -
```

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
  built before publishing — `bun run release` handles this. The eslint packages have no
  build step (they ship `index.js` directly).
- Publish order matters: each family's base package must publish before the package that
  peers on it (`event-bus` before `event-bus-react`, `eslint-config` before
  `eslint-config-react`). The `release` script enforces the order.
- Publishing does not require a Git tag; tag and push however you prefer.
</content>
