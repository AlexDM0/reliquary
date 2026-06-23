# @reliquary/event-bus-react

React 18 / 19 hooks for [`@reliquary/event-bus`](../core). You create your typed bus,
bind the hooks to it once, and every component shares that one instance — fully typed
against your own event map, no Context, no module-level singleton.

> **Full documentation:** [Concepts](../docs/concepts.md) · [React guide](../docs/event-bus-react.md) ·
> [Architecture](../docs/architecture.md) · [React data-flow diagrams](../docs/react-data-flow.md)

## Install

```sh
bun add @reliquary/event-bus @reliquary/event-bus-react react
```

`@reliquary/event-bus` and `react` are peer dependencies (React `^18 || ^19`).

## Usage

Bind the hooks to a bus in one place and re-export them:

```ts
// events.ts
import { createEventBus } from '@reliquary/event-bus';
import { createEventBusHooks } from '@reliquary/event-bus-react';

interface AppEvents {
  toast:       string;
  count:       number;
  ping:        void;
  usersBanned: { affectedUsers: number[]; reason: string };
}

export const EventBus = createEventBus<AppEvents>();
export const {
  useEvent,
  useEventCallback,
  useSharedState,
  useSharedStateInitializer,
} = createEventBusHooks(EventBus);
```

```tsx
import { EventBus, useEvent, useSharedState } from './events';

function Toasts() {
  const toast = useEvent('toast');           // re-renders with the latest payload
  return toast ? <div>{toast}</div> : null;
}

function Counter() {
  const [count, setCount] = useSharedState('count', 0); // shared, non-null
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

EventBus.emit('toast', 'hello');
```

## Hooks

- `useEvent(topic)` — subscribe; re-render with the latest payload (`null` until first emit).
- `useEventCallback(topic, cb)` — run `cb` on emit without re-rendering (always the latest `cb`).
- `useSharedState(topic, initial?)` — non-null `useState`-like binding to `EventBus.state` (pass `initial` to set+read, omit to read a value set elsewhere; throws if uninitialized).
- `useSharedStateInitializer(topic, initial)` — seed a topic's shared state once, no subscription.

The hooks use plain `useState` + `useEffect` and support React 18 and 19. See
[React data flow](../docs/react-data-flow.md) for the update model and trade-offs.
