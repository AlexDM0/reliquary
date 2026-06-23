import {
  beforeEach,
  describe,
  expect,
  mock,
  test
} from 'bun:test';

import { InMemorySharedStateManager, type SharedStateManager } from '../shared-state/SharedStateManager';
import { createEventBus, EventBus }                            from './EventBus';


interface TestEvents {
  ping:  void;
  login: { userId: string };
  count: number;
}

describe('EventBus', () => {
  let eventBus: EventBus<TestEvents>;

  beforeEach(() => {
    eventBus = new EventBus<TestEvents>();
  });


  describe('on / emit', () => {
    test('calls a subscribed callback when its topic is emitted', () => {
      const cb = mock();
      eventBus.on('login', cb);

      eventBus.emit('login', { userId: '42' });

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ userId: '42' });
    });

    test('emits void topics without a data argument', () => {
      const cb = mock();
      eventBus.on('ping', cb);

      eventBus.emit('ping');

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(undefined);
    });

    test('does nothing when emitting a topic with no subscribers', () => {
      expect(() => eventBus.emit('login', { userId: '1' })).not.toThrow();
    });

    test('only notifies subscribers of the emitted topic', () => {
      const loginCb = mock();
      const countCb = mock();
      eventBus.on('login', loginCb);
      eventBus.on('count', countCb);

      eventBus.emit('count', 1);

      expect(countCb).toHaveBeenCalledTimes(1);
      expect(loginCb).not.toHaveBeenCalled();
    });

    test('notifies every subscriber of a topic', () => {
      const a = mock();
      const b = mock();
      eventBus.on('count', a);
      eventBus.on('count', b);

      eventBus.emit('count', 99);

      expect(a).toHaveBeenCalledWith(99);
      expect(b).toHaveBeenCalledWith(99);
    });

    test('delivers a falsy payload (0) to subscribers verbatim', () => {
      const cb = mock();
      eventBus.on('count', cb);

      eventBus.emit('count', 0);

      expect(cb).toHaveBeenCalledWith(0);
    });

    test('a subscriber added during an emit is not called for that emit', () => {
      const calls: string[] = [];
      const late = mock();
      eventBus.on('count', () => {
        calls.push('first');
        eventBus.on('count', late); // subscribes mid-emit
      });

      eventBus.emit('count', 1);
      expect(calls).toEqual(['first']);
      expect(late).not.toHaveBeenCalled(); // not delivered this emit

      eventBus.emit('count', 2);
      expect(late).toHaveBeenCalledTimes(1); // active from the next emit on
      expect(late).toHaveBeenCalledWith(2);
    });

    test('is fail-fast: a throwing listener aborts delivery and propagates', () => {
      const before = mock();
      const after  = mock();
      eventBus.on('count', before);
      eventBus.on('count', () => { throw new Error('boom'); });
      eventBus.on('count', after);

      expect(() => eventBus.emit('count', 1)).toThrow('boom');
      expect(before).toHaveBeenCalledWith(1); // listeners before the throw ran
      expect(after).not.toHaveBeenCalled();   // listeners after the throw are skipped
    });
  });


  describe('unsubscribe', () => {
    test('returns a function that removes the subscriber', () => {
      const cb = mock();
      const off = eventBus.on('count', cb);

      off();
      eventBus.emit('count', 1);

      expect(cb).not.toHaveBeenCalled();
    });

    test('only removes the unsubscribed callback, leaving others active', () => {
      const a = mock();
      const b = mock();
      const offA = eventBus.on('count', a);
      eventBus.on('count', b);

      offA();
      eventBus.emit('count', 5);

      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledWith(5);
    });

    test('is idempotent — calling the unsubscribe twice is safe', () => {
      const cb = mock();
      const off = eventBus.on('count', cb);

      off();
      expect(() => off()).not.toThrow();
      eventBus.emit('count', 1);

      expect(cb).not.toHaveBeenCalled();
    });

    test('a subscriber can unsubscribe itself during emit', () => {
      const calls: number[] = [];
      const off = eventBus.on('count', (n) => {
        calls.push(n);
        off();
      });

      eventBus.emit('count', 1);
      eventBus.emit('count', 2);

      expect(calls).toEqual([1]);
    });

    test('a subscriber unsubscribing a not-yet-called one mid-emit skips it', () => {
      const calls: string[] = [];
      let offB = () => {};
      eventBus.on('count', () => { calls.push('a'); offB(); }); // runs first, removes B
      offB = eventBus.on('count', () => { calls.push('b'); });  // should be skipped this emit

      eventBus.emit('count', 1);
      expect(calls).toEqual(['a']);

      eventBus.emit('count', 2);
      expect(calls).toEqual(['a', 'a']);
    });

    test('a subscriber unsubscribing an already-called one does not double-fire it', () => {
      const calls: string[] = [];
      let offA = () => {};
      offA = eventBus.on('count', () => { calls.push('a'); }); // runs first
      eventBus.on('count', () => { calls.push('b'); offA(); }); // removes A after A ran

      eventBus.emit('count', 1);
      expect(calls).toEqual(['a', 'b']);

      eventBus.emit('count', 2);
      expect(calls).toEqual(['a', 'b', 'b']);
    });

    test('the same callback subscribed twice fires twice; each unsubscribe is independent', () => {
      const cb = mock();
      const off1 = eventBus.on('count', cb);
      eventBus.on('count', cb);

      eventBus.emit('count', 1);
      expect(cb).toHaveBeenCalledTimes(2);

      off1();
      eventBus.emit('count', 2);
      expect(cb).toHaveBeenCalledTimes(3);
    });

    test('a topic can be re-subscribed after its last subscriber leaves', () => {
      const a = mock();
      const off = eventBus.on('count', a);
      off(); // empties and deletes the topic's subscriber map

      const b = mock();
      eventBus.on('count', b);
      eventBus.emit('count', 7);

      expect(b).toHaveBeenCalledWith(7);
      expect(a).not.toHaveBeenCalled();
    });
  });


  describe('state', () => {
    test('round-trips a value through state.set / state.get', () => {
      eventBus.state.set('login', { userId: '7' });

      expect(eventBus.state.get('login')).toEqual({ userId: '7' });
    });

    test('state.get throws for an unregistered topic', () => {
      expect(() => eventBus.state.get('login')).toThrow(/No value stored for topic/);
    });

    test('state.has reflects whether a topic is registered', () => {
      expect(eventBus.state.has('count')).toBe(false);
      eventBus.state.set('count', 0);
      expect(eventBus.state.has('count')).toBe(true);
    });

    test('state.get returns a stored falsy value (0) instead of throwing', () => {
      eventBus.state.set('count', 0);

      expect(() => eventBus.state.get('count')).not.toThrow();
      expect(eventBus.state.get('count')).toBe(0);
    });

    // `has` keys off raw map presence (`data.has`) while `get` keys off the
    // "undefined = no data" contract, so a deliberately stored `undefined` reads
    // as present via `has` yet is still rejected by `get`. Reachable only on an
    // `unknown` topic — the sanctioned escape hatch that admits `undefined` while
    // still classifying as a data topic (so `get` accepts it).
    test('a stored undefined value is present (has) but still throws on get', () => {
      interface UnknownEvents { payload: unknown }
      const bus = new EventBus<UnknownEvents>();

      bus.state.set('payload', undefined);

      expect(bus.state.has('payload')).toBe(true);
      expect(() => bus.state.get('payload')).toThrow(/No value stored for topic/);
    });

    test('emit auto-updates shared state for a registered topic that has subscribers', () => {
      eventBus.state.set('count', 0);
      eventBus.on('count', mock());

      eventBus.emit('count', 5);

      expect(eventBus.state.get('count')).toBe(5);
    });

    // The shared-state sync runs independently of the subscriber loop, so a registered
    // topic is kept in sync on emit even when it has no subscribers.
    test('emit syncs shared state for a registered topic even with no subscribers', () => {
      eventBus.state.set('count', 0);

      eventBus.emit('count', 5);

      expect(eventBus.state.get('count')).toBe(5);
    });

    test('emit does not start tracking an unregistered topic', () => {
      eventBus.emit('count', 5);

      expect(() => eventBus.state.get('count')).toThrow(/No value stored for topic/);
    });

    test('state.set does not invoke subscribers', () => {
      const cb = mock();
      eventBus.on('count', cb);

      eventBus.state.set('count', 3);

      expect(cb).not.toHaveBeenCalled();
    });

    test('emit still delivers to subscribers while syncing shared state', () => {
      const cb = mock();
      eventBus.state.set('count', 0);
      eventBus.on('count', cb);

      eventBus.emit('count', 8);

      expect(cb).toHaveBeenCalledWith(8);
      expect(eventBus.state.get('count')).toBe(8);
    });

    test('state.reset(topic) clears one topic and leaves others intact', () => {
      eventBus.state.set('login', { userId: '1' });
      eventBus.state.set('count', 9);

      eventBus.state.reset('count');

      expect(() => eventBus.state.get('count')).toThrow(/No value stored for topic/);
      expect(eventBus.state.get('login')).toEqual({ userId: '1' });
    });

    test('state.reset() with no argument clears every topic', () => {
      eventBus.state.set('login', { userId: '1' });
      eventBus.state.set('count', 9);

      eventBus.state.reset();

      expect(eventBus.state.has('login')).toBe(false);
      expect(eventBus.state.has('count')).toBe(false);
    });
  });


  describe('custom state manager', () => {
    test('uses an injected SharedStateManager instead of the default', () => {
      const calls: Array<[string, unknown]> = [];
      const custom: SharedStateManager<TestEvents> = {
        get:   (topic) => calls.find(([t]) => t === topic)?.[1] as never,
        set:   (topic, value) => { calls.push([String(topic), value]); },
        has:   (topic) => calls.some(([t]) => t === topic),
        reset: () => { calls.length = 0; },
      };
      const customBus = new EventBus<TestEvents>({ state: custom });

      customBus.state.set('count', 3);

      expect(customBus.state).toBe(custom);
      expect(calls).toEqual([['count', 3]]);
    });

    test('the default manager is an InMemorySharedStateManager', () => {
      expect(eventBus.state).toBeInstanceOf(InMemorySharedStateManager);
    });
  });


  describe('reset', () => {
    test('removes all subscribers across all topics', () => {
      const a = mock();
      const b = mock();
      eventBus.on('count', a);
      eventBus.on('ping', b);

      eventBus.reset();
      eventBus.emit('count', 1);
      eventBus.emit('ping');

      expect(a).not.toHaveBeenCalled();
      expect(b).not.toHaveBeenCalled();
    });

    test('clears shared state as well as subscribers', () => {
      eventBus.state.set('count', 1);

      eventBus.reset();

      expect(() => eventBus.state.get('count')).toThrow(/No value stored for topic/);
    });

    test('the event bus is reusable after a reset', () => {
      eventBus.on('count', mock());
      eventBus.reset();

      const cb = mock();
      eventBus.on('count', cb);
      eventBus.emit('count', 1);

      expect(cb).toHaveBeenCalledWith(1);
    });
  });
});


describe('createEventBus', () => {
  test('returns a working EventBus instance (nameable as EventBus)', () => {
    const EventBus = createEventBus<TestEvents>();
    const cb = mock();

    EventBus.on('count', cb);
    EventBus.emit('count', 3);

    expect(cb).toHaveBeenCalledWith(3);
  });

  test('forwards options to the constructor', () => {
    const custom: SharedStateManager<TestEvents> = {
      get:   () => undefined as never,
      set:   () => {},
      has:   () => false,
      reset: () => {},
    };

    const instance = createEventBus<TestEvents>({ state: custom });

    expect(instance).toBeInstanceOf(EventBus);
    expect(instance.state).toBe(custom);
  });
});


describe('event-map type rules', () => {
  // A data payload must not include `undefined`; `null` is a normal value. These
  // assertions are enforced by `tsc --noEmit` (the spec is in the typecheck globs).
  interface EdgeEvents {
    cleared: string | null;      // allowed — `null` is a real, present value
    maybe:   string | undefined; // unsupported — neither void nor data
    generic: unknown;            // allowed — the generic escape hatch (user casts)
  }

  test('a payload that can be null is an ordinary data topic', () => {
    const bus = new EventBus<EdgeEvents>();
    const cb = mock();
    bus.on('cleared', cb);

    bus.emit('cleared', null);
    expect(cb).toHaveBeenCalledWith(null);

    bus.state.set('cleared', null);
    expect(bus.state.has('cleared')).toBe(true);
    expect(bus.state.get('cleared')).toBeNull();
  });

  test('an `unknown` payload is a data topic — the generic escape hatch', () => {
    const bus = new EventBus<EdgeEvents>();
    const cb = mock();
    bus.on('generic', cb);

    // Requires a value (not void); any value is accepted, and reads come back as
    // `unknown` for the user to cast.
    bus.emit('generic', { id: 42 });
    expect(cb).toHaveBeenCalledWith({ id: 42 });

    bus.state.set('generic', 'anything');
    const value = bus.state.get('generic'); // typed `unknown`
    expect(value).toBe('anything');
  });

  test('a payload that can be undefined is rejected at compile time', () => {
    // Compile-time only — never executed (the body would throw at runtime). The
    // `@ts-expect-error` directives are verified by `tsc --noEmit`.
    const typeChecks = (bus: EventBus<EdgeEvents>) => {
      // @ts-expect-error 'maybe' includes `undefined`, so it is neither a void nor
      // a data topic — `emit` has no overload that accepts it.
      bus.emit('maybe', 'hi');

      // @ts-expect-error same reason — `state.get` only accepts data topics.
      bus.state.get('maybe');
    };

    expect(typeof typeChecks).toBe('function');
  });
});
