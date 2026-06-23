# @reliquary/event-bus

A tiny, fully type-safe event bus with optional, swappable shared state. Zero
runtime dependencies. Ships **ESM + CommonJS** with bundled type declarations, so
it imports cleanly into either an ESM or a CommonJS project without forcing ESM
on you.

- **Type-safe** — one event map describes every topic and its payload.
- **Shared state** — read the last value of a topic without re-emitting, under `EventBus.state`.
- **Swappable** — replace the state backend with your own implementation.

> See also: [Concepts](./concepts.md) · [Architecture](./architecture.md) · [Event flow diagrams](./event-flow.md)

## Installation

```sh
bun add @reliquary/event-bus   # or npm / pnpm / yarn
```

## Defining an event map

An event map is a plain `{ topic: payload }` type. A `void` payload marks a topic
that carries no data.

```ts
interface AppEvents {
  login:       { userId: string };
  toast:       string;
  logout:      void;
  usersBanned: { affectedUsers: number[]; reason: string };
}
```

Payloads can be any type — primitives, `void`, or structured objects like
`usersBanned`. The map drives every signature on the bus: emitting `login`
*requires* a `{ userId }`, emitting `logout` *forbids* any argument, and listeners
receive the correctly typed payload.

A payload must **not** include `undefined` (e.g. `string | undefined`, or an optional
property). At runtime `undefined` is the marker for a `void` topic, so a data payload of
`undefined` would be ambiguous — such a topic is treated as neither void nor data and is
rejected by `emit`/`state` at compile time. Use `void` for a no-data topic, or `null`
for an "absent but present" value.

`unknown` is the one exception: it counts as a data payload, serving as the escape hatch
for a generic bus (e.g. dynamically-generated topics). You must pass a value when
emitting, and reads come back as `unknown` for you to cast — the type responsibility is
yours.

## Creating a bus

Use the `createEventBus` factory. As a plain function it lets you name the instance
`EventBus` without colliding with the exported class:

```ts
import { createEventBus } from '@reliquary/event-bus';

export const EventBus = createEventBus<AppEvents>();
```

## Subscribing

`on` registers a listener and returns an unsubscribe function.

```ts
const off = EventBus.on('login', ({ userId }) => {
  console.log('logged in', userId);
});

off(); // stop listening
```

Unsubscribing is idempotent and safe to call during an emit — a listener may even
remove itself while handling an event. Subscribing during an emit is also safe; the new
listener starts from the next emit, not the one in flight.

## Emitting

```ts
EventBus.emit('login', { userId: '42' });                       // data required & type-checked
EventBus.emit('usersBanned', { affectedUsers: [1, 7], reason: 'spam' });
EventBus.emit('logout');                                        // void topic — no argument allowed
```

Every listener for the topic is invoked synchronously, in subscription order. See
[the emit flow](./event-flow.md#emit) for the exact sequence, including how shared
state is kept in sync.

Delivery is **fail-fast**: listener errors are not isolated. If a listener throws, the
remaining listeners are not invoked and the error propagates out of `emit` to the
caller (shared state, synced before delivery, has already been updated). Keep listeners
total, or guard inside them, if one listener must not be able to starve the others.

> **Events are lossy.** An emit only reaches listeners subscribed at that moment — a
> consumer that subscribes later will not see it. When a late consumer must still get
> the value, use [shared state](#shared-state) instead. See [Concepts](./concepts.md#events-are-lossy).

## Shared state

Each bus carries a shared-state store under `EventBus.state` — the last known value of
a topic, readable at any time without re-emitting. When a topic is registered in
shared state, `emit` keeps it in sync automatically.

```ts
EventBus.state.set('toast', 'saved');
EventBus.state.get('toast');   // 'saved'
EventBus.state.has('toast');   // true

EventBus.emit('toast', 'updated');
EventBus.state.get('toast');   // 'updated' — emit synced it

EventBus.state.reset('toast'); // clear one topic
EventBus.state.reset();        // clear all topics
```

`get` throws if the topic has no stored value, so guard with `has` when a value may
not exist yet. See the [topic lifecycle diagram](./event-flow.md#shared-state-lifecycle).

## Swapping the state backend

`EventBus.state` *is* whatever you pass to the factory. Provide any object that
implements `SharedStateManager` to back shared state with `localStorage`, an
observable, a signal library, etc. The default is `InMemorySharedStateManager`.

```ts
import { createEventBus, type SharedStateManager } from '@reliquary/event-bus';

const persisted: SharedStateManager<AppEvents> = {
  get(topic) { /* read from your store */ },
  set(topic, value) { /* write to your store */ },
  has(topic) { /* … */ },
  reset(topic) { /* clear one topic, or all when topic is undefined */ },
};

export const EventBus = createEventBus<AppEvents>({ state: persisted });
```

> **`has` is load-bearing.** On every `emit`, the bus calls `state.has(topic)` and only
> `set`s the value when it returns `true` — that is how `emit` keeps registered topics in
> sync without ever starting to track a new one. A custom manager must return `true` for
> every topic it treats as tracked (including ones populated via `set`), otherwise `emit`
> will silently skip syncing them.

## Resetting

```ts
EventBus.reset(); // remove every subscriber AND clear all shared state
```

The bus is fully reusable afterwards.

## React

For hooks, see [`@reliquary/event-bus-react`](./event-bus-react.md).

## API reference

### `createEventBus<EventMap>(options?)`

`createEventBus(options?: { state?: SharedStateManager<EventMap> }): EventBus<EventMap>`
— the recommended way to create a bus. Equivalent to `new EventBus(options)`, but as a
function it keeps the name `EventBus` free for your instance. `EventBus` (the class) is
also exported for `new`/`instanceof` and as a type.

### `class EventBus<EventMap>`

| Member | Signature | Description |
| --- | --- | --- |
| constructor | `new EventBus(options?: { state?: SharedStateManager<EventMap> })` | Create a bus directly; prefer `createEventBus`. |
| `on` | `on(topic, callback): () => void` | Subscribe; returns an unsubscribe function. |
| `emit` | `emit(topic)` / `emit(topic, data)` | Notify listeners; void topics take no data, data topics require it. |
| `state` | `SharedStateManager<EventMap>` | The shared-state store (injected or default). |
| `reset` | `reset(): void` | Remove all subscribers and clear all shared state. |

### `interface SharedStateManager<EventMap>`

| Method | Signature | Description |
| --- | --- | --- |
| `get` | `get(topic): EventMap[topic]` | Current value; throws if unregistered. |
| `set` | `set(topic, value): void` | Store/overwrite a topic's value. |
| `has` | `has(topic): boolean` | Whether a topic has a stored value. |
| `reset` | `reset(topic?): void` | Clear one topic, or all when called with no argument. |

### Other exports

- `class InMemorySharedStateManager<EventMap>` — the default Map-backed backend.
- Types: `EventTopic`, `VoidEventTopic`, `DataEventTopic`, `EventCallback`.

## Module format

The package publishes both ESM and CommonJS with separate, matching type
declarations (`.d.ts` for ESM, `.d.cts` for CommonJS). A TypeScript or JavaScript
project consuming it via `require` resolves the CommonJS build and its CommonJS
types; an ESM project resolves the ESM build. Neither is forced onto the other.
