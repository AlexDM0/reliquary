import type { DataEventTopic, TopicKeyedMap } from '../types';

/**
 * The contract the {@link EventBus} uses to persist "shared state" — the last
 * known value of a topic, readable without re-emitting. Provide your own
 * implementation (Map-backed, localStorage-backed, observable, …) via the
 * `state` constructor option; the default is {@link InMemorySharedStateManager}.
 */
export interface SharedStateManager<EventMap> {
  /**
   * The current value for `topic`. Implementations should throw if the topic
   * has no stored value — call {@link has} first when that is a possibility.
   */
  get<T extends DataEventTopic<EventMap>>(topic: T): EventMap[T];

  /** Store (or overwrite) the value for `topic`. */
  set<T extends keyof EventMap>(topic: T, value: EventMap[T]): void;

  /** Whether `topic` currently has a stored value. */
  has(topic: keyof EventMap): boolean;

  /** Clear a single topic's value, or — when called with no argument — all of them. */
  reset(topic?: DataEventTopic<EventMap>): void;
}

/** The default, Map-backed {@link SharedStateManager}. Holds everything in memory. */
export class InMemorySharedStateManager<EventMap> implements SharedStateManager<EventMap> {
  private data: TopicKeyedMap<EventMap, EventMap> = new Map();

  get<T extends DataEventTopic<EventMap>>(topic: T): EventMap[T] {
    // The bus's contract treats `undefined` as "no data" (the basis of the
    // void/data topic split), so an absent topic and a topic explicitly stored
    // as `undefined` are both rejected here — even though `has` reports raw map
    // presence and so still returns `true` for the latter.
    const value = this.data.get(topic);
    if (value === undefined) {
      throw new Error(
        `No value stored for topic: ${String(topic)}. Did you forget to provide an initial value somewhere?`,
      );
    }
    return value;
  }

  set<T extends keyof EventMap>(topic: T, value: EventMap[T]): void {
    this.data.set(topic, value);
  }

  has(topic: keyof EventMap): boolean {
    return this.data.has(topic);
  }

  reset(topic?: DataEventTopic<EventMap>): void {
    if (topic === undefined) {
      this.data.clear();
    } else {
      this.data.delete(topic);
    }
  }
}
