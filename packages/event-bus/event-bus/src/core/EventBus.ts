import { InMemorySharedStateManager, type SharedStateManager } from '../shared-state/SharedStateManager';
import type {
  DataEventTopic,
  EventCallback,
  TopicKeyedMap,
  VoidEventTopic
} from '../types';


/** The subscribers for a single topic `T` in map `EventMap`, keyed by their listener id. */
export type TopicSubscribers<EventMap, T extends keyof EventMap> = Map<string, EventCallback<EventMap, T>>;

/** A map from topic to its subscribers. */
export type TopicMap<EventMap> = TopicKeyedMap<EventMap, { [K in keyof EventMap]: TopicSubscribers<EventMap, K> }>;

export interface EventBusOptions<EventMap> {
  /**
   * The shared-state backend, exposed as {@link EventBus.state}. Defaults to an
   * in-memory store. Pass any {@link SharedStateManager} implementation to swap it.
   */
  state?: SharedStateManager<EventMap>;
}

/**
 * A type-safe event bus with optional shared state. Prefer the {@link createEventBus}
 * factory over `new EventBus(...)` — it lets you name the instance `EventBus` without
 * colliding with this class. Supply your own event map as the type argument:
 *
 *   interface MyEvents { login: { userId: string }; logout: void }
 *   const EventBus = createEventBus<MyEvents>();
 *   EventBus.emit('login', { userId: '1' });  // data required
 *   EventBus.emit('logout');                  // no data allowed
 *
 * Shared state lives under `.state`:
 *
 *   EventBus.state.set('login', { userId: '1' });
 *   EventBus.state.get('login');              // { userId: '1' }
 */
export class EventBus<EventMap> {
  private topics: TopicMap<EventMap> = new Map();

  /** Source of subscriber ids — unique within this bus instance. */
  private nextSubscriberId = 0;

  /**
   * Topics currently mid-fire. A re-entrant emit on one of these is deferred to a
   * later tick (see {@link dispatch}) instead of recursing, so the stack stays flat.
   */
  private readonly firing = new Set<keyof EventMap>();

  /** The shared-state store. Holds the last known value per topic; kept in sync on `emit`. */
  readonly state: SharedStateManager<EventMap>;

  constructor(options?: EventBusOptions<EventMap>) {
    this.state = options?.state ?? new InMemorySharedStateManager<EventMap>();
  }

  on<T extends keyof EventMap>(topic: T, callback: EventCallback<EventMap, T>): () => void {
    let subscribers = this.topics.get(topic);
    if (!subscribers) {
      subscribers = new Map();
      this.topics.set(topic, subscribers);
    }

    const id = String(this.nextSubscriberId++);

    subscribers.set(id, callback);

    return () => {
      this.unsubscribe(topic, id);
    };
  }

  private unsubscribe<T extends keyof EventMap>(topic: T, id: string): void {
    const subscribers = this.topics.get(topic);
    if (!subscribers) {
      return;
    }

    // Removing from the Map is safe even mid-emit: an entry deleted before it
    // is reached during iteration is simply skipped.
    subscribers.delete(id);

    // clean up empty topics
    if (subscribers.size === 0) {
      this.topics.delete(topic);
    }
  }

  // Void topics take no data argument; data topics require theirs.
  emit<T extends VoidEventTopic<EventMap>>(topic: T): void;
  emit<T extends DataEventTopic<EventMap>>(topic: T, data: EventMap[T]): void;
  emit<T extends keyof EventMap>(topic: T, data?: EventMap[T]): void {
    // The overload signatures guarantee `data` matches the topic, so the cast
    // is safe here (it is `undefined` only for void topics, which want that).
    this.dispatch(topic, data as EventMap[T]);
  }

  private dispatch<T extends keyof EventMap>(topic: T, eventData: EventMap[T]): void {
    // Re-entrancy: if this topic is already mid-fire (a listener of it is emitting it
    // again), defer the new emit to a later tick with `setImmediate` instead of
    // recursing. The stack stays flat, emit order is preserved (deferred emits run in
    // the order they were made), and any pending synchronous code runs in between.
    // Relying on delivery order across subscribers is an anti-pattern — see this
    // package's CLAUDE.md.
    if (this.firing.has(topic)) {
      setImmediate(() => { this.dispatch(topic, eventData); });
      return;
    }

    this.firing.add(topic);
    try {
      // keep the shared state in sync with the event bus, if it is used.
      if (this.state.has(topic)) {
        this.state.set(topic, eventData);
      }

      const subscribers = this.topics.get(topic);
      if (subscribers) {
        // Snapshot the subscriber ids so a listener that subscribes to this same
        // topic while handling the event is not invoked for the in-flight emit
        // (it becomes active from the next emit). Re-check each id against the live
        // Map before calling, so a listener removed earlier in this same emit —
        // by itself or another — is still skipped.
        for (const id of [...subscribers.keys()]) {
          const callback = subscribers.get(id);
          if (callback) {
            callback(eventData);
          }
        }
      }
    } finally {
      this.firing.delete(topic);
    }
  }

  reset(): void {
    this.topics.clear();
    this.state.reset();
  }
}

/**
 * Create an {@link EventBus}. Equivalent to `new EventBus(options)`, but as a plain
 * function it avoids a name collision when you want to call the instance `EventBus`:
 *
 *   import { createEventBus } from '@reliquary/event-bus';
 *   export const EventBus = createEventBus<MyEvents>();
 *
 * Importing only `createEventBus` (not the class value) keeps the name `EventBus`
 * free for your instance.
 */
export function createEventBus<EventMap>(options?: EventBusOptions<EventMap>): EventBus<EventMap> {
  return new EventBus<EventMap>(options);
}
