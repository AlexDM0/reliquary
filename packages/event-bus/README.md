# event-bus

A tiny, type-safe event bus, split into two npm packages:

| Package | What |
| --- | --- |
| [`@reliquary/event-bus`](event-bus) | Pure-TS core. Zero deps. Ships ESM + CJS with bundled types. |
| [`@reliquary/event-bus-react`](event-bus-react) | React 18/19 hooks bound to your bus instance. |

The react package depends on the core as a **peer dependency** and imports nothing
from it at runtime (it only uses the bus instance you hand it).

## Documentation

Published as part of the reliquary docs site at
**<https://alexdm0.github.io/reliquary/event-bus/>** (built with
[VitePress](https://vitepress.dev), deployed to GitHub Pages on every push to `main`).
The source lives alongside this README in [`docs/`](docs):

| Doc | What |
| --- | --- |
| [Concepts](docs/concepts.md) | Why an event bus, the mental model, when to use it (diagrams) |
| [Core guide](docs/event-bus.md) | `@reliquary/event-bus` API and usage |
| [React guide](docs/event-bus-react.md) | `@reliquary/event-bus-react` hooks and patterns |
| [Architecture](docs/architecture.md) | Package graph, build pipeline, release flow (diagrams) |
| [Event flow](docs/event-flow.md) | Subscribe/emit and shared-state behaviour (diagrams) |
| [React data flow](docs/react-data-flow.md) | How the hooks bridge the bus to React state (diagrams) |

## Layout

```
packages/event-bus/
  event-bus/        # @reliquary/event-bus
  event-bus-react/  # @reliquary/event-bus-react
```

> Build the core before the react package — the react package resolves
> `@reliquary/event-bus` from its built output. `bun run build` (at the repo root)
> handles the order; for active dev, run `tsdown --watch` in `event-bus/`.

See the repo [README](../../README.md) for workspace-wide tooling and commands.

## License

[MIT](../../LICENSE) © Alex de Mulder
