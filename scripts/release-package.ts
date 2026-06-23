/**
 * Publishes the package in the current working directory, then tags the release
 * `<name>@<version>`. Invoked as each package's `release:npm` script.
 *
 * Guarded: runs only when RELIQUARY_RELEASE is set, which the root `release:*` scripts
 * do — a direct `bun run release:npm` (or a hand `bun publish`) is refused, so every
 * publish goes through the root gate (verify + dependency order).
 *
 * Idempotent: if this `<name>@<version>` is already on the registry the publish is
 * skipped, so a partial `release:all` can be re-run cleanly — already-published packages
 * are passed over and only the missing ones publish. The tag is created when absent
 * regardless, so a re-run also reconciles tags for packages published on an earlier run.
 *
 * Reads name/version from the package's own `package.json`, NOT the `npm_package_*` env
 * vars: under `bun run --filter … release:npm` those resolve to the ROOT manifest
 * (`reliquary`, no version), which would tag every package `reliquary@`.
 */
import { $ } from 'bun';

if (!process.env.RELIQUARY_RELEASE) {
  console.error('Release only via the root scripts (bun run release:all or release:NAME), not directly');
  process.exit(1);
}
 
const { name, version } = await Bun.file('package.json').json();
const tag = `${name}@${version}`;

const alreadyPublished = (await $`npm view ${tag} version`.nothrow().quiet()).exitCode === 0;

if (alreadyPublished) {
  console.log(`• ${tag} already on the registry — skipping publish`);
} else {
  await $`bun publish`;
  console.log(`• published ${tag}`);
}

const tagExists = (await $`git tag -l ${tag}`.quiet()).stdout.toString().trim() !== '';
if (tagExists) {
  console.log(`• tag ${tag} already present`);
} else {
  await $`git tag -a ${tag} -m ${tag}`;
  console.log(`• tagged ${tag}`);
}
