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

    if (subscribers.size === 0) {
      this.topics.delete(topic);
    }
  }

  // Void topics take no data argument; data topics require theirs.
  emit<T extends VoidEventTopic<EventMap>>(topic: T): void;
  emit<T extends DataEventTopic<EventMap>>(topic: T, data: EventMap[T]): void;
  emit<T extends keyof EventMap>(topic: T, data?: EventMap[T]): void {
    // `data` is `undefined` only for void topics, which the overloads enforce — cast is safe.
    this.dispatch(topic, data as EventMap[T]);
  }

  private dispatch<T extends keyof EventMap>(topic: T, eventData: EventMap[T]): void {
    // A re-entrant emit — fired from a listener of this same topic — is deferred to the
    // next tick instead of recursing, so it runs after the current fire, in emit order.
    if (this.firing.has(topic)) {
      setImmediate(() => { this.dispatch(topic, eventData); });
      return;
    }

    this.firing.add(topic);
    try {
      if (this.state.has(topic)) {
        this.state.set(topic, eventData);
      }
      this.notifySubscribers(topic, eventData);
    } finally {
      this.firing.delete(topic);
    }
  }

  private notifySubscribers<T extends keyof EventMap>(topic: T, eventData: EventMap[T]): void {
    const subscribers = this.topics.get(topic);
    if (!subscribers) {
      return;
    }

    // Iterate a snapshot of ids: a listener that subscribes mid-emit waits until the next
    // emit, while one unsubscribed mid-emit is skipped (hence the live-Map re-check).
    for (const id of [...subscribers.keys()]) {
      const callback = subscribers.get(id);
      if (callback) {
        callback(eventData);
      }
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
