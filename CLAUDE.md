# reliquary

Bun-workspace monorepo collecting published npm packages under the `@reliquary` scope.
Packages are grouped into **families**, one directory per family at `packages/<family>/`,
holding that family's packages plus a family README. Workspaces glob: `packages/*/*`.

Families:

- **event-bus** (`packages/event-bus/`) — a tiny, type-safe event bus.
  - **`@reliquary/event-bus`** (`packages/event-bus/event-bus`) — pure-TS core, zero deps, ships ESM + CJS + types.
  - **`@reliquary/event-bus-react`** (`packages/event-bus/event-bus-react`) — React 18/19 hooks; core + react are peers.
- **eslint** (`packages/eslint/`) — shared linting config, split so non-React projects don't pull React tooling.
  - **`@reliquary/eslint-config`** (`packages/eslint/eslint-config`) — framework-agnostic ESLint 9 flat config (TS + stylistic + imports). Plain ESM, **no build step** (ships `index.js` directly); plugins are runtime `dependencies`, `eslint` is a peer. Default export is a flat-config array.
  - **`@reliquary/eslint-config-react`** (`packages/eslint/eslint-config-react`) — React + Jest + Testing Library layer; default export is a flat-config array meant to be composed on top (`[...base, ...react]`). `@reliquary/eslint-config` + `eslint` are peers. Plain ESM, no build.
  - The root `eslint.config.mjs` dogfoods both.

Toolchain: Bun workspaces · tsdown (per-package ESM/CJS/types) · Changesets · attw + publint.
Docs: one umbrella VitePress site — the shell (config + landing) at `docs/`, each family's
pages inside its package at `packages/<family>/docs/` (pulled into the single site via
`srcDir: '..'` + `rewrites` in `docs/.vitepress/config.mts`). Deployed to GitHub Pages on
push to `main` (`.github/workflows/docs.yml`); `bun run docs:dev` / `docs:build` locally.
Build event-bus core before react (`bun run build` enforces order). See `README.md`.

## Working agreement

- **Never `git commit` or `git push` without an explicit instruction in the current
  message.** A task request ("do X", "fix Y", "bump to 0.2", "make a LICENSE") is not
  permission to commit. Make and verify the changes, report what changed, and leave
  them unstaged for review. Only stage/commit when the message explicitly says so
  (e.g. "commit this", "commit your work").
- **When you do commit, make clean commits.** Group related changes together so each
  commit is one coherent change with a concise but descriptive message. Don't lump
  unrelated changes into a single commit. Keep messages short (a tight subject line) and
  never include AI references — no `Co-Authored-By: Claude`, no "Generated with" footer.
- **Every commit is a green snapshot.** A commit's tests must pass against that same
  commit's code — never land tests whose implementation only arrives in a later commit.
  When one file mixes changes destined for different commits (e.g. new tests plus unrelated
  tidy-ups), split it: temporarily lift the dependent tests out, commit the rest, then
  restore and commit the feature together with its tests.

## Reviewing and fixing bugs — sceptical, red tests, written report

- **Be sceptical.** On a review request, actively hunt for bugs and incorrect
  assumptions — don't trust the code's stated intent. **Grill the requester** (ask)
  whenever there are uncertainties instead of guessing.
- **Review order:** review *all the code* first; only once you're satisfied with the code
  do you review the tests — scenarios and coverage. Coverage need not be 100%, but every
  sensible case must be covered.
- **Scale up when needed:** if a lot of files are in scope, use ultracode (a multi-agent
  workflow). Any subagents spawned for a review must be **opus** agents.
- **Reproduce every bug with a red test:** write failing (red) unit tests, one per bug, in
  `<file>.review.spec.ts` files. **During a review the only code you may change or write is
  failing tests — never touch production code.**
- **Output `REVIEW_<ISOString>.md`** with all findings and recommendations.
- **After fixes land** (by me or by you), delete the `.review.spec.ts` files and decide per
  case whether each belongs in the existing suite — keep it only if it fills a coverage gap
  or guards a regression; otherwise drop it.
- **On a bug-fix request with no existing test:** write the failing test first, fix the
  bug, confirm it goes green, then review your own work and clean up the same way (fold
  worthwhile cases into the real suite, remove the scratch `.review.spec.ts`).
- **No comment or test may reference historical states of the codebase.** Describe only
  the current ("actual") behaviour — never "this used to…" or "previously…".
- **No `any` in tests.** When a test needs an escape-hatch type to reach an edge case, use
  a typed mock type (e.g. a local `interface MockEvents { topic: unknown }`) rather than
  `any`. `unknown` is allowed; `any` is lazy test writing — it opts out of type checking
  entirely and hides whether the test exercises the typed API. In `@reliquary/event-bus`
  an `unknown` topic is still a `DataEventTopic` (the sanctioned generic escape hatch), so
  it reaches `state.get`/`set` paths the strict typed API forbids — use it instead of
  `EventBus<any>`.

## Code style — self-documenting over comments

Prioritise readable, self-documenting code over comments — in production code **and tests**.

- Let well-named functions, methods, and variables carry intent. Prefer extracting a named
  helper (e.g. `notifySubscribers(...)`, `flushDeferredEmits()`) over a comment that narrates
  a block.
- Keep comments only for the non-obvious **why**: rationale, subtle invariants, surprising
  mechanisms (why a `setImmediate` defer, why a snapshot-then-recheck loop, what a test's spy
  plumbing proves). Delete comments that merely restate what the code does.
- In tests, lean on descriptive `test(...)` titles and meaningful local names
  (`before`/`after`/`late`/`order`) instead of inline narration — a test should read as its
  own spec.
- Avoid duplication, but only up to the point where removing it still reads clearly. A shared
  helper that erases repeated boilerplate is good; over-extracting two short,
  one-field-different setups into harder-to-follow indirection is not. Self-contained beats
  clever.

## Improve the way of working

After any completed task, evaluate whether the process could be optimised and suggest
changes to the way of working — typically an addition to this `CLAUDE.md`. Keep the
suggestion short; skip it when there's genuinely nothing to improve.

**Project memory lives in `CLAUDE.md`.** Record durable preferences, conventions, and
learnings for this project in the checked-in `CLAUDE.md` (root, family, or package per the
layering rules) so they stay portable and travel with the repo — not in any external or
per-user memory store.

**`consolidate` (experimental).** When I say "consolidate", fold the patterns established
in the current conversation into the way of working — persist them at the right level
(usually an addition to the relevant `CLAUDE.md`: root, family, or package per the layering
rules). If you're not confident which parts of the discussion I'm referring to, ask before
writing.

## Documentation must stay in sync with the code ("actual")

**Treat docs as part of every change.** Whenever you change a package's public API,
behaviour, build, or structure, update every affected doc in the *same* change and keep
it accurate — never leave docs describing how things used to work.

"Docs" includes the layered `CLAUDE.md` files — root, family (`packages/<family>/CLAUDE.md`),
and package (`packages/<family>/<package>/CLAUDE.md`) — which record accepted design
decisions. When a change touches a behaviour one of them describes, update the file at the
right level in the same change (see the **Design decisions** section below).

Doc ↔ code map:

| When you change… | Update… |
| --- | --- |
| `packages/event-bus/event-bus/src` (core API/behaviour) | `packages/event-bus/event-bus/README.md`, `packages/event-bus/docs/event-bus.md`, `packages/event-bus/docs/event-flow.md`; if it touches an accepted behaviour, `packages/event-bus/event-bus/CLAUDE.md` (or the family `packages/event-bus/CLAUDE.md` for a shared invariant) |
| `packages/event-bus/event-bus-react/src` (hooks) | `packages/event-bus/event-bus-react/README.md`, `packages/event-bus/docs/event-bus-react.md`, `packages/event-bus/docs/react-data-flow.md`; if it touches an accepted behaviour, `packages/event-bus/event-bus-react/CLAUDE.md` (or the family `packages/event-bus/CLAUDE.md` for a shared invariant) |
| `packages/eslint/eslint-config/index.js` (base lint rules) | `packages/eslint/eslint-config/README.md`, `packages/eslint/README.md`, `packages/eslint/docs/eslint-config.md`, `README.md` |
| `packages/eslint/eslint-config-react/index.js` (react lint rules) | `packages/eslint/eslint-config-react/README.md`, `packages/eslint/README.md`, `packages/eslint/docs/eslint-config.md`, `README.md` |
| Conceptual model, when-to-use, lossy/shared-state semantics | `packages/event-bus/docs/concepts.md` |
| A family's package set, structure, or overview | the family README (`packages/<family>/README.md`) |
| An accepted design decision (new, changed, or removed) | the right-level `CLAUDE.md` — a cross-cutting invariant in the family `packages/<family>/CLAUDE.md`, a package-specific one in that package's `CLAUDE.md`, monorepo-wide guidance in the root `CLAUDE.md` |
| Package names, exports, deps, build, tooling | `README.md`, `packages/event-bus/docs/architecture.md`, the relevant package README, **the relevant `CLAUDE.md`** (root, family, or package) |
| The release/publish flow — `release*` scripts, `release:npm`, versioning, tagging, publish gate | `RELEASE.md` |
| The docs toolchain — VitePress config (`docs/.vitepress/config.mts`), custom theme (`docs/.vitepress/theme/`), or its build/plugin deps | Verify **both** `bun run docs:dev` *and* `bun run docs:build` work — a dev-only `optimizeDeps` resolution failure (e.g. Bun not hoisting a plugin's transitive deps to top-level `node_modules`) yields a white screen in dev while the build still passes, so checking only one hides the bug |
| Any Mermaid diagram | Re-validate it — every diagram must render. |

A **pre-commit hook** (`.githooks/pre-commit`, wired via `core.hooksPath`) enforces this:
a commit that touches `packages/*/*/src` or a `package.json` but updates no documentation is
blocked, and the hook runs `build → typecheck → lint → test` so documented behaviour stays
valid. It counts a `docs/` file, `README.md`, `RELEASE.md`, `CLAUDE.md`, or `CHANGELOG.md`
as documentation. Bypass only deliberately with `SKIP_DOC_CHECK=1 git commit …` or `git commit --no-verify`.
A readability-only or test-only commit that changes no documented behaviour is a legitimate
`SKIP_DOC_CHECK=1` case (the hook still runs build → typecheck → lint → test).
After updating any doc, re-read it to confirm it matches the current code.

## Design decisions — accepted, don't "fix"

Per-package design decisions (deliberate, reviewed behaviours — don't file them as bugs
or "harden" them away; preserve the behaviour *and* the reasoning on any change to the
surrounding code) live in each package's own `CLAUDE.md`, loaded automatically when you
work in that package:

- `packages/event-bus/CLAUDE.md` — event-bus family: cross-cutting invariants shared by
  both packages (`undefined` = "no data", the `unknown` escape hatch, events-are-lossy).
- `packages/event-bus/event-bus/CLAUDE.md` — core: type/payload semantics, emit/delivery
  (fail-fast, fixed delivery set), shared-state invariants.
- `packages/event-bus/event-bus-react/CLAUDE.md` — React hooks: render-phase seed,
  render→effect window, once-per-mount `initialValue`, shared-state retention.

When you make or change an accepted decision, record it at the right level — a shared
invariant in the family `CLAUDE.md`, a package-specific one in that package's `CLAUDE.md`
(not here). If a decision starts overlapping both packages, hoist it to the family file.

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
