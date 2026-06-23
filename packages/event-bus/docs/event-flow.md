# Event flow

How subscriptions, emits, and shared state behave at runtime in
[`@reliquary/event-bus`](./event-bus.md).

## Subscribe and emit

`on` stores a listener under its topic and returns an unsubscribe function. `emit`
synchronously notifies every listener for the topic, in subscription order, and — if
the topic is registered in shared state — updates that stored value first.

```mermaid
sequenceDiagram
  participant C as Consumer
  participant B as EventBus
  participant S as EventBus.state
  participant L as Listeners

  C->>B: on('login', cb)
  B->>L: store cb under 'login'
  B-->>C: unsubscribe()

  C->>B: emit('login', data)
  B->>S: has('login')?
  alt registered in shared state
    B->>S: set('login', data)
  end
  loop each listener for 'login'
    B->>L: cb(data)
  end
```

## Emit

`emit` keeps shared state in sync independently of whether the topic has listeners,
and only for topics already registered in shared state — it never starts tracking a
new topic on its own.

```mermaid
flowchart TD
  E["emit(topic, data)"] --> H{"EventBus.state.has(topic)?"}
  H -->|yes| SET["EventBus.state.set(topic, data)"]
  H -->|no| SKIP["leave shared state untouched"]
  SET --> N{"any subscribers?"}
  SKIP --> N
  N -->|yes| LOOP["invoke each listener in order"]
  N -->|no| DONE["done"]
  LOOP --> DONE
```

Listeners may unsubscribe themselves or others during an emit; the iteration is safe
because a removed listener is simply skipped if it has not yet been reached.

## Shared-state lifecycle

A topic's shared state moves through three observable states. `get` succeeds only
while the topic is registered.

```mermaid
stateDiagram-v2
  [*] --> Unregistered
  Unregistered --> Registered: state.set(topic, v) / initial value
  Registered --> Registered: emit(topic, v) auto-sync / state.set
  Registered --> Unregistered: state.reset(topic)
  Registered --> [*]: EventBus.reset()
  note right of Unregistered
    state.get(topic) throws here
  end note
```

## Reset

`EventBus.reset()` clears both halves of the bus at once — every subscriber across
every topic, and all shared state — leaving a clean, reusable bus.

```mermaid
flowchart LR
  R["EventBus.reset()"] --> T["clear all topic subscribers"]
  R --> S["EventBus.state.reset() — clear all shared state"]
```
