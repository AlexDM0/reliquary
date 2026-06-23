# event-bus — shared design decisions

Cross-cutting invariants that **both** `@reliquary/event-bus` (core) and
`@reliquary/event-bus-react` depend on. **Don't file them as bugs or "harden" them
away** — preserve the behaviour *and* the reasoning on any change. Package-specific
decisions live one level down in each package's own `CLAUDE.md`; the root `CLAUDE.md` has
the monorepo working agreement and doc-sync rules.

- **`undefined` = "no data" is the core invariant.** A topic's payload is either `void`
  (no data) or a concrete value; a data payload whose type *includes* `undefined` is
  rejected, because at runtime `undefined` is the marker for a void topic and would be
  ambiguous. Use `void` for no-data topics, or `null` for an "absent but present" value.
  Manifestations: the type-level enforcement and shared-state `has`/`get` disagreement in
  `event-bus/CLAUDE.md`; `useEvent`'s handling of an emitted `undefined` in
  `event-bus-react/CLAUDE.md`.
- **`unknown` is the sanctioned generic escape hatch.** `unknown` is treated as a *data*
  payload (so `get`/`emit` accept it) and the user owns the cast on read/emit. Because it
  admits `undefined`, emitting `undefined` on an `unknown` topic follows the rule above
  (treated as "no data"). `any` is the other escape hatch — see `event-bus/CLAUDE.md`.
- **Events are lossy.** An emit only reaches listeners subscribed at that moment; a late
  subscriber never sees it. Shared state is the escape hatch when a late reader must still
  get a value. The core's `emit` and the React hooks' render→effect subscription window are
  both instances of this — not bugs to "close".
