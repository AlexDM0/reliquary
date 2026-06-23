# @reliquary/event-bus — design decisions

Core-specific accepted behaviours. **Don't file them as bugs or "harden" them away** —
preserve the behaviour (and the reasoning) on any change to the surrounding code.
Cross-cutting invariants shared with the React package (the `undefined` = "no data" rule,
the `unknown` escape hatch, events-are-lossy) live one level up in
`packages/event-bus/CLAUDE.md`. See the root `CLAUDE.md` for the working agreement.

## Type / payload semantics

- **The `undefined` = "no data" invariant is enforced at the type level** in `src/types.ts`
  (the `VoidEventTopic` / `DataEventTopic` split). `any` and `unknown` are the two escape
  hatches.
- **`any` opts out of the void/data discrimination.** An `any` payload satisfies both
  `VoidEventTopic` and `DataEventTopic` — inherent to `any`, by definition. Don't try to
  exclude it. In tests, reach edge cases with a typed `unknown` topic, not `EventBus<any>`.

## Emit / delivery

- **Delivery is fail-fast.** A listener that throws aborts the loop — later listeners are
  not called and the error propagates to whoever called `emit`; shared state (synced
  before delivery) is already updated. Don't wrap callbacks in try/catch to "isolate"
  errors — keep listeners total, or guard inside them.
- **The delivery set is fixed when an emit starts.** A listener added during an emit is
  **not** called for that emit (it becomes active from the next); a listener removed
  before it is reached is skipped. Don't "fix" added-mid-emit listeners to fire in the
  same emit — the snapshot-then-recheck loop in `dispatch` is deliberate.
- **Re-entrant emits are deferred, and order is guaranteed but must not be relied on.**
  Emitting a topic from inside one of its own listeners does not recurse: while a topic is
  mid-fire, a re-entrant `emit` is scheduled for a later tick with `setImmediate`, so the
  current fire completes and other synchronous code runs first. Deferred emits run in the
  order they were made, so the bus *does* deliver deterministically — but **relying on
  cross-subscriber ordering is an anti-pattern**: a subscriber must not assume anything
  about other subscribers, and an emitter must not know *who* subscribes beyond handing
  the bus anonymous callbacks. An infinite re-emit loop is the caller's problem, not the
  bus's — we don't guard against it. Deferral uses `setImmediate` directly (a Node/Bun
  global), so re-entrant emits require a `setImmediate`-providing runtime. (Note: a
  re-entrant emit already scheduled for a later tick is not cancelled by a `reset()` or by
  a fail-fast throw in the current fire; it fires against whatever the bus looks like
  then.)

## Shared state

- **`InMemorySharedStateManager` keys "no data" on `value === undefined`.** A topic
  explicitly `set` to `undefined` — only reachable via a custom manager or the
  `unknown`/`any` escape hatch — reads as present via `has()` yet throws on `get()`. That
  is the family `undefined` = "no data" invariant applied to storage, not a separate bug.
- **`SharedStateManager.has` is load-bearing.** `emit` calls `has(topic)` and only `set`s
  when it returns `true`, so it never starts tracking a new topic on its own. A custom
  manager must return `true` for every topic it treats as tracked, or `emit` will silently
  skip syncing them. Documented in the `has` JSDoc.
