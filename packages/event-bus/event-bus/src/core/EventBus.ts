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
    const subscribers = this.topics.get(topic);
    // The overload signatures guarantee `data` matches the topic, so the cast
    // is safe here (it is `undefined` only for void topics, which want that).
    const eventData = data as EventMap[T];

    // keep the shared state in sync with the event bus, if it is used.
    if (this.state.has(topic)) {
      this.state.set(topic, eventData);
    }

    if (subscribers) {
      // Iterating the Map directly is safe: a subscriber that unsubscribes
      // (itself or another) while handling this event is removed from the Map,
      // and an entry deleted before it is reached is skipped — no copy needed.
      for (const callback of subscribers.values()) {
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
