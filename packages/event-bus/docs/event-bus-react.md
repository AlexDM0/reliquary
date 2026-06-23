# @reliquary/event-bus-react

React 18 / 19 hooks for [`@reliquary/event-bus`](./event-bus.md). Bind the hooks to your
own typed bus instance once, and every component shares that instance — fully typed
against your event map, with no Context and no module-level singleton.

> See also: [Concepts](./concepts.md) · [Architecture](./architecture.md) · [React data-flow diagrams](./react-data-flow.md)

## Installation

```sh
bun add @reliquary/event-bus @reliquary/event-bus-react react
```

`@reliquary/event-bus` and `react` are **peer dependencies** (React `^18 || ^19`). The
react package imports nothing from the core at runtime — it only operates on the
bus instance you hand it — so a single core install is shared by both.

## The factory

`createEventBusHooks(EventBus)` returns a set of hooks bound to one specific bus. Call
it once where you own the bus, then re-export the hooks:

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

This is the only setup step. Every hook is inferred from the bus's event map, so
`useEvent('toast')` is typed `string | null`, `useEvent('usersBanned')` is typed
`{ affectedUsers: number[]; reason: string } | null`, and unknown topics are compile errors.
See [how the factory binds hooks to one instance](./react-data-flow.md#factory-binding).

## Hooks

### `useEvent(topic)`

Subscribe to a topic and re-render with its latest payload. Returns `null` until the
first emit, and `null` again after `topic` changes until the new topic emits. For `void`
topics it still re-renders on every emit (a "something happened" signal); the value stays
`null`.

```tsx
function Toasts() {
  const toast = useEvent('toast');
  return toast ? <div className="toast">{toast}</div> : null;
}
```

`useEvent` is **lossy** — it only sees emits while mounted, and starts at `null`. If a
component must read a value that may have been set before it mounted, use
`useSharedState` instead, which reads the retained shared value. See
[Concepts: events are lossy](./concepts.md#events-are-lossy).

### `useEventCallback(topic, callback)`

Run a callback on every emit **without** re-rendering. The latest `callback` is
always used (no stale closure), and the subscription is only re-created when `topic`
changes.

```tsx
function Logger() {
  useEventCallback('toast', (msg) => analytics.track('toast', { msg }));
  return null;
}
```

### `useSharedState(topic, initialValue?)`

A **non-null** `useState`-like binding to the bus's shared state — `useEvent` with a
guaranteed value, so you skip the null checks without prop-drilling a default.

- **With `initialValue`** — sets *and* reads in one call (acts as the initializer plus
  a read; it overwrites any current value). Use this in the component that owns the value.
- **Without `initialValue`** — reads a value established elsewhere (a component rendered
  before it that passed one, or `useSharedStateInitializer`). If the topic has no value
  yet, the hook **throws** — a missing initializer fails fast instead of reading `undefined`.

The `topic` is fixed for the component's lifetime. Unlike `useEvent`/`useEventCallback`,
this hook does not re-bind when `topic` changes, so passing a different topic on a later
render **throws** rather than silently returning the previous topic's value. Remount with
a `key` if you need to switch topics.

The setter has a stable identity across renders (like a `useState` setter), so it is safe
to pass to memoised children or list in effect dependency arrays.

```tsx
// The owner provides the initial value:
function Counter() {
  const [count, setCount] = useSharedState('count', 0); // `number`, never null
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Elsewhere, read it without re-specifying a default:
function Readout() {
  const [count] = useSharedState('count');
  return <span>{count}</span>;
}
```

### `useSharedStateInitializer(topic, initialValue)`

Set a topic's shared state to `initialValue` on mount (and whenever `topic` changes),
without subscribing or returning a value. It runs in an **effect**, so it sets once per
mount — a later external reset is not undone. Because the set happens in an effect
(after render), components reading the topic via `useSharedState(topic)` without their
own initial must render *after* this has run; otherwise pass an `initialValue` at the
read site.

```tsx
function App() {
  // Establish the default once, near the top.
  useSharedStateInitializer('count', 10);
  return <Dashboard />; // descendants read it with useSharedState('count')
}
```

## How it works

Each hook subscribes to the bus in a `useEffect` and drives a `useState` (or a small
force-update counter for `void` topics), giving a single, predictable update path:

```
EventBus.emit(...) → listener fires → setState → React re-renders
```

The subscription is created in an effect and torn down on unmount or when `topic`
changes. The full data flow is in [React data flow](./react-data-flow.md).

## React 18 and 19

The hooks use only stable, long-standing React APIs (`useState`, `useEffect`,
`useRef`), so both major versions are supported via the `^18 || ^19` peer range. The
hook test suite runs against **both** React 18 and 19 in CI.

## Server rendering

The hooks only subscribe inside effects (which do not run on the server), so they
render without throwing during SSR — `useEvent` starts at `null` and `useSharedState`
returns its seeded value or `undefined`. Create the bus per request if you need
isolation between requests.

## API reference

| Hook | Signature | Re-renders? |
| --- | --- | --- |
| `useEvent` | `(topic) => EventMap[topic] \| null` | Yes, on each emit |
| `useEventCallback` | `(topic, cb) => void` | No |
| `useSharedState` | `(topic, initial?) => [value, setValue]` (value is non-null; throws if uninitialized) | Yes, on shared-state change |
| `useSharedStateInitializer` | `(topic, initial) => void` | No |

- `createEventBusHooks<EventMap>(EventBus: EventBus<EventMap>)` — returns the four hooks above.
