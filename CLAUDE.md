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

## Documentation must stay in sync with the code ("actual")

**Treat docs as part of every change.** Whenever you change a package's public API,
behaviour, build, or structure, update every affected doc in the *same* change and keep
it accurate — never leave docs describing how things used to work.

Doc ↔ code map:

| When you change… | Update… |
| --- | --- |
| `packages/event-bus/event-bus/src` (core API/behaviour) | `packages/event-bus/event-bus/README.md`, `packages/event-bus/docs/event-bus.md`, `packages/event-bus/docs/event-flow.md` |
| `packages/event-bus/event-bus-react/src` (hooks) | `packages/event-bus/event-bus-react/README.md`, `packages/event-bus/docs/event-bus-react.md`, `packages/event-bus/docs/react-data-flow.md` |
| `packages/eslint/eslint-config/index.js` (base lint rules) | `packages/eslint/eslint-config/README.md`, `packages/eslint/README.md`, `packages/eslint/docs/eslint-config.md`, `README.md` |
| `packages/eslint/eslint-config-react/index.js` (react lint rules) | `packages/eslint/eslint-config-react/README.md`, `packages/eslint/README.md`, `packages/eslint/docs/eslint-config.md`, `README.md` |
| Conceptual model, when-to-use, lossy/shared-state semantics | `packages/event-bus/docs/concepts.md` |
| A family's package set, structure, or overview | the family README (`packages/<family>/README.md`) |
| Package names, exports, deps, build, tooling | `README.md`, `packages/event-bus/docs/architecture.md`, the relevant package README, **this `CLAUDE.md`** |
| Any Mermaid diagram | Re-validate it — every diagram must render. |

A **pre-commit hook** (`.githooks/pre-commit`, wired via `core.hooksPath`) enforces this:
a commit that touches `packages/*/*/src` or a `package.json` but updates no documentation is
blocked, and the hook runs `build → typecheck → lint → test` so documented behaviour stays
valid. Bypass only deliberately with `SKIP_DOC_CHECK=1 git commit …` or `git commit --no-verify`.
After updating any doc, re-read it to confirm it matches the current code.

## Design decisions (event-bus) — accepted, don't "fix"

These are deliberate and have been reviewed. Don't file them as bugs or "harden" them
away; preserve the behaviour (and the reasoning) on any change to the surrounding code.

- **`undefined` = "no data" is the core invariant.** A data payload is rejected if its
  type *includes* `undefined` (see `packages/event-bus/event-bus/src/types.ts`): at
  runtime `undefined` is the marker for a void (no-data) topic, so an `undefined`-bearing
  data payload would be ambiguous. Use `void` for no-data topics, or `null` for an
  "absent but present" value. `InMemorySharedStateManager.get()` follows from this — it
  rejects a stored `undefined` as "no data" (keying on `value === undefined`), while
  `has()` reports raw map presence. The two intentionally disagree for a topic explicitly
  set to `undefined`: `has() === true` yet `get()` throws.
- **`any` opts out of the void/data discrimination.** An `any` payload satisfies both
  `VoidEventTopic` and `DataEventTopic` — inherent to `any`, by definition. Don't try to
  exclude it. In tests, reach edge cases with a typed `unknown` topic, not `EventBus<any>`.
- **`unknown` is the sanctioned generic escape hatch.** `unknown` is treated as a *data*
  payload (so `get`/`emit` accept it) and the user owns the cast on read/emit. Because
  `unknown` admits `undefined`, emitting `undefined` on an `unknown` topic is treated as a
  void-style signal by `useEvent` (the value does not update) — consistent with the
  `undefined` = "no data" rule. The user owns this contract.
- **The render-phase write in `useSharedState`'s `useState` initializer is intentional.**
  It is minimised to a single run-once seed (no `storedRef`). The residual render-phase
  write is required so the seeded value is visible synchronously to later-rendered
  descendants; removing it fully would need `useSyncExternalStore`, which conflicts with
  that requirement.

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
