import type { DataEventTopic, EventBus, EventTopic } from '@reliquary/event-bus';
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';


/**
 * Bind a set of React hooks to a specific {@link EventBus} instance. Call once
 * (e.g. in a module that owns your bus) and re-export the returned hooks:
 *
 *   // events.ts
 *   import { createEventBus } from '@reliquary/event-bus';
 *   import { createEventBusHooks } from '@reliquary/event-bus-react';
 *
 *   interface AppEvents { login: { userId: string }; toast: string; ping: void }
 *   export const EventBus = createEventBus<AppEvents>();
 *   export const { useEvent, useEventCallback, useSharedState, useSharedStateInitializer } =
 *     createEventBusHooks(EventBus);
 *
 * Every hook is fully typed against the bus's own event map and shares the one
 * instance you pass in — there is no module-level singleton and no Context.
 */
export function createEventBusHooks<EventMap>(EventBus: EventBus<EventMap>) {
  /**
   * Subscribe to `topic` and re-render with its latest payload. Returns `null`
   * until the first emit, and `null` again after `topic` changes until the new
   * topic emits. For `void` topics it still re-renders on every emit (use it as a
   * "something happened" signal); the value stays `null`.
   *
   * Data payloads must never be `undefined` (the event map disallows it — use
   * `void` for no-data topics, or `null` for an absent-but-present value), so an
   * `undefined` payload here always and only means a void topic.
   */
  function useEvent<T extends EventTopic<EventMap>>(topic: T): EventMap[T] | null {
    const [data, setData] = useState<EventMap[T] | null>(null);
    const [, force] = useState(0);

    // On topic change, reset to null so the previous topic's value is not returned
    // before the new topic emits.
    const subscribedTopic = useRef(topic);
    if (subscribedTopic.current !== topic) {
      subscribedTopic.current = topic;
      setData(null);
    }

    useEffect(() => {
      const unsubscribe = EventBus.on(topic, (eventData: EventMap[T]) => {
        // `eventData` is `undefined` for void topics — re-render without a value.
        if (eventData !== undefined) {
          setData(eventData);
        } else {
          force((n) => n + 1);
        }
      });

      return () => {
        unsubscribe();
      };
    }, [topic]);

    return data;
  }

  /**
   * Run `callback` whenever `topic` is emitted, without re-rendering. The latest
   * `callback` is always used (no stale closure) and the subscription is not
   * torn down on every render — only when `topic` changes.
   */
  function useEventCallback<T extends EventTopic<EventMap>>(
    topic: T,
    callback: (data: EventMap[T]) => void,
  ): void {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
      const unsubscribe = EventBus.on(topic, (eventData: EventMap[T]) => {
        callbackRef.current(eventData);
      });

      return () => {
        unsubscribe();
      };
    }, [topic]);
  }

  /**
   * A **non-null**, `useState`-like binding to the bus's shared state — `useEvent`
   * with a guaranteed value, so consumers skip the null checks without prop-drilling
   * a default down the tree.
   *
   * Provide `initialValue` to set-and-read in a single call (it acts as
   * {@link useSharedStateInitializer} + a read, and overwrites any current value).
   * Omit it to read a value established elsewhere — e.g. by a component higher up
   * that passed an `initialValue`, or by {@link useSharedStateInitializer}. If the
   * topic has no value when read, the hook throws.
   *
   * The `topic` is fixed for the component's lifetime: passing a different topic on
   * a later render throws. Remount with a `key` if you need to switch topics.
   */
  function useSharedState<T extends DataEventTopic<EventMap>>(
    topic: T,
    initialValue?: EventMap[T],
  ): [EventMap[T], (newValue: EventMap[T]) => void] {
    // Bound to a single topic for the component's lifetime; a changed topic is a usage error.
    const boundTopic = useRef(topic);
    if (boundTopic.current !== topic) {
      throw new Error(
        `useSharedState: topic changed from "${String(boundTopic.current)}" to "${String(topic)}". `
        + 'This hook binds to a single topic; remount the component with a different '
        + '`key` instead of changing the topic.',
      );
    }

    const [data, setData] = useState<EventMap[T]>(() => {
      // Seed from `initialValue` on mount: the lazy initializer runs once, before
      // descendants render, so they read the seeded value.
      if (initialValue !== undefined) {
        EventBus.state.set(topic, initialValue);
        return initialValue;
      }

      // No `initialValue`: read a value established elsewhere (e.g. a parent's
      // useSharedStateInitializer). Fail fast if neither happened.
      if (!EventBus.state.has(topic)) {
        throw new Error(
          `useSharedState: topic "${String(topic)}" has no value. Pass an initialValue, `
          + 'or set it higher in the tree with useSharedStateInitializer.',
        );
      }
      return EventBus.state.get(topic);
    });

    useEffect(() => {
      const unsubscribe = EventBus.on(topic, (eventData: EventMap[T]) => {
        setData(eventData);
      });

      return () => {
        unsubscribe();
        // We do not clean up the shared state to avoid race conditions in the
        // creation and removal of components.
      };
    }, [topic]);

    // Memoised for a stable identity across renders (safe for memoised children and effect deps).
    const setValue = useCallback((newValue: EventMap[T]) => {
      // `emit` only writes shared state for already-tracked topics, so set
      // explicitly to guarantee the value is persisted, then emit to notify.
      EventBus.state.set(topic, newValue);
      EventBus.emit(topic, newValue);
    }, [topic]);

    return [data, setValue];
  }

  /**
   * Set the shared state for `topic` to `initialValue` on mount (and whenever
   * `topic` changes), without subscribing or returning a value. Useful in a
   * parent that owns a default the children read via {@link useSharedState}.
   *
   * Runs in an effect, so it sets once per mount rather than re-asserting on
   * every render — a later external reset of the topic is not undone.
   */
  function useSharedStateInitializer<T extends DataEventTopic<EventMap>>(
    topic: T,
    initialValue: EventMap[T],
  ): void {
    useEffect(() => {
      EventBus.state.set(topic, initialValue);
    }, [topic]);
  }

  return {
    useEvent,
    useEventCallback,
    useSharedState,
    useSharedStateInitializer,
  };
}
