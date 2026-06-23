# React data flow

How [`@reliquary/event-bus-react`](./event-bus-react.md) connects a bus to React using
`useState` + `useEffect`.

## Factory binding

`createEventBusHooks(EventBus)` closes over one bus instance and returns four hooks
all bound to it. There is no Context and no module-level singleton — the binding is
the closure. This is what fixes the classic bug of each hook accidentally owning a
separate bus.

```mermaid
graph LR
  Bus["EventBus = createEventBus()"] --> F["createEventBusHooks(EventBus)"]
  F --> H1["useEvent"]
  F --> H2["useEventCallback"]
  F --> H3["useSharedState"]
  F --> H4["useSharedStateInitializer"]
  H1 -.->|"EventBus.on / EventBus.emit"| Bus
  H2 -.->|"EventBus.on"| Bus
  H3 -.->|"EventBus.on / EventBus.state"| Bus
  H4 -.->|"EventBus.state"| Bus
```

## useEvent

`useEvent` subscribes to the topic in a `useEffect` and stores the latest payload in
`useState`. For `void` topics there is no payload, so it bumps a small force-update
counter instead — that way every emit still triggers a render.

```mermaid
sequenceDiagram
  participant Cmp as Component
  participant Hook as useEvent
  participant React as React
  participant Bus as EventBus

  Cmp->>Hook: render (returns current data)
  Hook->>Bus: useEffect → EventBus.on(topic, listener)

  Note over Bus: later — someone emits
  Bus-->>Hook: listener(data)
  Hook->>React: setData(data), or force re-render for void
  React->>Cmp: re-render with new data
```

The subscription is torn down on unmount or when `topic` changes (the effect's only
dependency).

## useSharedState

`useSharedState` stores `initialValue` (when given) during render, reads the current
value in `useState` — throwing if the topic was never initialized — and subscribes for
updates. The setter persists to shared state and emits, so every component bound to the
topic on the same bus re-renders. The returned value is non-null.

```mermaid
flowchart TD
  subgraph Read
    SEED["if initialValue given → EventBus.state.set(topic)"] --> READ["useState init → get(topic), throws if unset"]
    READ --> SUB["useEffect → EventBus.on(topic, setData)"]
    SUB --> VAL["value (non-null)"]
  end
  subgraph Write
    SET["setValue(next)"] --> PERSIST["EventBus.state.set(topic, next)"]
    PERSIST --> EMIT["EventBus.emit(topic, next)"]
  end
  EMIT -.->|"listener fires → setData"| SUB
```

Because the value is persisted in the shared bus rather than living only in component
state, two unrelated components calling `useSharedState('count', 0)` stay in sync.

## Design notes

| Concern | How the hooks handle it |
| --- | --- |
| Stale closures | `useEventCallback` reads the callback from a ref updated on every render, so it never fires a stale one. |
| Redundant re-subscribes | Subscriptions are keyed on `topic`, recreated only when it changes — not on every render. |
| `void` / repeated emits still re-render | `useEvent` bumps a force-update counter when the payload is `void`. |
| Server rendering | Subscriptions live in effects (which don't run on the server); the first render returns `null` or the seeded value. |

> **Trade-off.** These hooks use the simple `useState` + `useEffect` model. They are
> not protected against tearing under React's concurrent features, and an emit that
> lands between a component's render and its effect-subscribe can be missed. If your
> app relies heavily on concurrent rendering, wrap reads in
> [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
