# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

To record a change for release, run:

```sh
bun run changeset
```

Pick the affected package(s), the bump type (patch/minor/major), and write a short
summary. Commit the generated file. At release time:

```sh
bun run version-packages   # applies changesets, bumps versions, writes CHANGELOGs
bun run release            # builds, then `changeset publish` (core publishes before react)
```
