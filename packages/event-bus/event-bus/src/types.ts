/**
 * Generic helpers over an event map `EventMap` (a `{ topic: payload }` record, where
 * `void` payloads mean "no data"). They are parameterized by `EventMap` so the bus is
 * not tied to any single, hardcoded map.
 *
 * A topic's payload is either `void` (carries no data) or a concrete value type.
 * Payloads that *include* `undefined` (e.g. `string | undefined`, or an optional
 * property) are deliberately unsupported: at runtime `undefined` is the marker for a
 * void topic, so a data payload of `undefined` would be ambiguous. Such a topic is
 * classified as neither void nor data, which makes `emit`/`state` reject it at compile
 * time. Use `void` for no-data topics, or `null` for an "absent but present" value.
 *
 * `unknown` is the exception and is treated as a data payload: it's the sanctioned
 * escape hatch for a generic bus (e.g. dynamically-generated topics), where the user
 * accepts the type responsibility and casts the value on read/emit.
 */

/** All topic names in the event map `EventMap`. */
export type EventTopic<EventMap> = keyof EventMap;

/** Topics in `EventMap` whose payload is `void` (i.e. carry no data). */
export type VoidEventTopic<EventMap> = {
  [K in keyof EventMap]: EventMap[K] extends void ? K : never;
}[keyof EventMap];

/**
 * Topics in `EventMap` that carry a real (non-void) payload. A payload that can be
 * `undefined` is excluded — see the note above — so these topics always emit a value.
 * `unknown` is the deliberate exception (the generic-bus escape hatch).
 */
export type DataEventTopic<EventMap> = {
  [K in keyof EventMap]: undefined extends EventMap[K]
    ? (unknown extends EventMap[K] ? K : never)
    : K;
}[keyof EventMap];

/** A listener for topic `T` in map `EventMap`. */
export type EventCallback<EventMap, T extends keyof EventMap> = (data: EventMap[T]) => void;

/**
 * A topic-keyed map whose generic `get`/`set` keep each topic correlated to its own
 * value type (`Values[T]`), which a plain `Map<keyof EventMap, …>` would erase. `Values`
 * is a record over the same keys giving the per-topic value type.
 */
export interface TopicKeyedMap<EventMap, Values extends Record<keyof EventMap, unknown>> {
  get<T extends keyof EventMap>(topic: T): Values[T] | undefined;
  set<T extends keyof EventMap>(topic: T, value: Values[T]): this;
  has(topic: keyof EventMap): boolean;
  delete(topic: keyof EventMap): boolean;
  clear(): void;
}
