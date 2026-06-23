# @reliquary/event-bus

A tiny, fully type-safe event bus with optional, swappable shared state. Zero
runtime dependencies. Ships **ESM + CommonJS** with bundled type declarations, so
it imports cleanly into either an ESM or a CommonJS TypeScript/JavaScript project
without forcing ESM on you.

> **Full documentation:** [Concepts](../docs/concepts.md) · [Core guide](../docs/event-bus.md) ·
> [Architecture](../docs/architecture.md) · [Event flow diagrams](../docs/event-flow.md)

## Install

```sh
bun add @reliquary/event-bus   # or npm / pnpm / yarn
```

## Usage

Describe your events as a map (`void` payload = "no data"; a data payload must not
include `undefined` — use `void`, or `null` for an absent value, or `unknown` for a
generic cast-it-yourself payload), then create a bus with the `createEventBus` factory —
naming the instance `EventBus` without colliding with the class:

```ts
import { createEventBus } from '@reliquary/event-bus';

interface AppEvents {
  login:       { userId: string };
  toast:       string;
  logout:      void;
  usersBanned: { affectedUsers: number[]; reason: string };
}

export const EventBus = createEventBus<AppEvents>();

const off = EventBus.on('login', ({ userId }) => console.log('hi', userId));

EventBus.emit('login', { userId: '42' });                       // data required & type-checked
EventBus.emit('usersBanned', { affectedUsers: [1, 7], reason: 'spam' });
EventBus.emit('logout');                                        // void topic — no data allowed

off();           // unsubscribe
EventBus.reset();  // drop all subscribers and shared state
```

### Shared state

Every bus carries a shared-state store under `EventBus.state` — the last known value
of a topic, readable without re-emitting. `emit` keeps a registered topic in sync.

```ts
EventBus.state.set('toast', 'saved');
EventBus.state.get('toast');   // 'saved'
EventBus.state.has('toast');   // true
EventBus.state.reset('toast'); // clear one topic
EventBus.state.reset();        // clear all
```

### Swapping the state backend

`EventBus.state` is whatever you pass in. Provide any `SharedStateManager`
implementation (localStorage-backed, observable, etc.):

```ts
import { createEventBus, type SharedStateManager } from '@reliquary/event-bus';

const persisted: SharedStateManager<AppEvents> = { /* get / set / has / reset */ };
export const EventBus = createEventBus<AppEvents>({ state: persisted });
```

## React

For hooks, see [`@reliquary/event-bus-react`](../react).

## API

- `createEventBus<EventMap>(options?)` — factory returning an `EventBus<EventMap>` (recommended)
- `class EventBus<EventMap>` — `on`, `emit`, `reset`, `state`
- `interface SharedStateManager<EventMap>` — `get`, `set`, `has`, `reset`
- `class InMemorySharedStateManager<EventMap>` — the default backend
- types: `EventTopic`, `VoidEventTopic`, `DataEventTopic`, `EventCallback`
- `EventUtil` — `getUUID`, `getShortUUID`
