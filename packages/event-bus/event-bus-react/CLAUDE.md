# @reliquary/event-bus-react — design decisions

React-hook-specific accepted behaviours. **Don't file them as bugs or "harden" them
away** — preserve the behaviour (and the reasoning) on any change to the surrounding
code. Cross-cutting invariants shared with the core (the `undefined` = "no data" rule,
the `unknown` escape hatch, events-are-lossy) live one level up in
`packages/event-bus/CLAUDE.md`. See the root `CLAUDE.md` for the working agreement.

- **`useEvent` treats an emitted `undefined` as a void-style signal.** It re-renders
  without updating its value (stays `null` / unchanged) — the family `undefined` = "no
  data" rule applied to the hook. Relevant only for `unknown`/`any` topics that can carry
  `undefined` at runtime.
- **The render-phase write in `useSharedState`'s `useState` initializer is intentional.**
  It is minimised to a single run-once seed (no `storedRef`). The residual render-phase
  write is required so the seeded value is visible synchronously to later-rendered
  descendants; removing it fully would need `useSyncExternalStore`, which conflicts with
  that requirement.
- **The render→effect subscription window is accepted.** The hooks subscribe inside a
  `useEffect`, so an emit that lands between a component's first render and its effect
  commit is missed — `useEvent` stays `null` until the next emit. An instance of the
  family events-are-lossy rule; shared state (read synchronously at render via
  `useSharedState`) is the escape hatch when a late reader must still get a value. Not a
  bug to "close".
- **`useSharedState`'s `initialValue` is a once-per-mount seed, not a controlled prop.**
  Changing it on a later render is intentionally ignored; after the seed, the value is
  driven by emits/`setValue`. Remount with a `key` to re-seed.
- **Shared state is retained on unmount (not cleaned up).** Only the subscription is torn
  down on unmount; the value is deliberately left in `EventBus.state` (removing it would
  race component creation/teardown). For a fixed set of topics this is harmless, but
  **dynamically-keyed topics** (e.g. `useSharedState('item:' + id)`) grow the store
  unbounded — clear them yourself with `EventBus.state.reset(topic)` or scope them to a
  shorter-lived bus.
