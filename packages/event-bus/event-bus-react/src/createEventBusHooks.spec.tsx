import { EventBus } from '@reliquary/event-bus';
import {
  act,
  cleanup,
  render,
  renderHook
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  mock,
  spyOn,
  test
} from 'bun:test';
import { StrictMode, useState } from 'react';


import { createEventBusHooks } from './createEventBusHooks';


interface TestEvents {
  ping:  void;
  toast: string;
  count: number;
  total: number;
}

function setup() {
  const eventBus = new EventBus<TestEvents>();
  const hooks = createEventBusHooks(eventBus);
  return { eventBus, ...hooks };
}

afterEach(() => {
  cleanup();
});


describe('useEvent', () => {
  test('returns null before any emit, then the latest payload', () => {
    const { eventBus, useEvent } = setup();
    const { result } = renderHook(() => useEvent('toast'));

    expect(result.current).toBeNull();

    act(() => eventBus.emit('toast', 'hello'));
    expect(result.current).toBe('hello');

    act(() => eventBus.emit('toast', 'world'));
    expect(result.current).toBe('world');
  });

  test('re-renders on every void emit even though the value stays null', () => {
    const { eventBus, useEvent } = setup();
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useEvent('ping');
    });

    const before = renders;
    act(() => eventBus.emit('ping'));
    act(() => eventBus.emit('ping'));

    // One re-render per void emit: two emits → a delta of exactly two (neither dropped).
    expect(result.current).toBeNull();
    expect(renders - before).toBe(2);
  });

  test('resubscribes when topic changes and drops the old topic', () => {
    const { eventBus, useEvent } = setup();
    const { result, rerender } = renderHook(
      ({ topic }: { topic: 'toast' | 'count' }) => useEvent(topic),
      { initialProps: { topic: 'toast' as 'toast' | 'count' } },
    );

    act(() => eventBus.emit('toast', 'a'));
    expect(result.current).toBe('a');

    rerender({ topic: 'count' });
    // Switched to a fresh topic with no emit yet: should read as null, not the
    // previous topic's value.
    expect(result.current).toBeNull();

    act(() => eventBus.emit('count', 7));
    expect(result.current).toBe(7);

    // The old topic is no longer subscribed.
    act(() => eventBus.emit('toast', 'b'));
    expect(result.current).toBe(7);
  });

  test('stops updating after unmount', () => {
    const { eventBus, useEvent } = setup();
    const { unmount } = renderHook(() => useEvent('toast'));

    unmount();
    expect(() => act(() => eventBus.emit('toast', 'x'))).not.toThrow();
  });
});


describe('shared instance (the bug this fixes)', () => {
  test('useEvent and useEventCallback observe the SAME emit', () => {
    const { eventBus, useEvent, useEventCallback } = setup();
    const spy = mock();

    const { result } = renderHook(() => {
      useEventCallback('toast', spy);
      return useEvent('toast');
    });

    act(() => eventBus.emit('toast', 'shared'));

    expect(result.current).toBe('shared');
    expect(spy).toHaveBeenCalledWith('shared');
  });

  test('two separate components see each other\'s shared state', () => {
    const { useSharedState } = setup();

    const A = () => {
      const [count, setCount] = useSharedState('count', 0); // owner provides the initial
      return <button type="button" onClick={() => setCount(count + 1)}>a:{count}</button>;
    };
    const B = () => {
      const [count] = useSharedState('count');             // reads A's seed, no initial
      return <span>b:{count}</span>;
    };

    const screen = render(<><A /><B /></>);
    expect(screen.getByText('a:0')).toBeDefined();
    expect(screen.getByText('b:0')).toBeDefined();

    act(() => {
      screen.getByText('a:0').click();
    });

    expect(screen.getByText('a:1')).toBeDefined();
    expect(screen.getByText('b:1')).toBeDefined();
  });
});


describe('useEventCallback', () => {
  test('uses the latest callback, no stale closure', () => {
    const { eventBus, useEventCallback } = setup();
    const seen: string[] = [];

    const { rerender } = renderHook(
      ({ tag }: { tag: string }) => useEventCallback('toast', (data) => seen.push(`${tag}:${data}`)),
      { initialProps: { tag: 'v1' } },
    );

    act(() => eventBus.emit('toast', 'a'));
    rerender({ tag: 'v2' });
    act(() => eventBus.emit('toast', 'b'));

    expect(seen).toEqual(['v1:a', 'v2:b']);
  });

  test('does not re-subscribe on every render', () => {
    const { eventBus, useEventCallback } = setup();
    const spy = mock();
    const onSpy = spyOn(eventBus, 'on');

    const { rerender } = renderHook(() => {
      const [, force] = useState(0);
      useEventCallback('toast', spy);
      return force;
    });

    rerender();
    rerender();

    // The [topic]-dep effect subscribes once and never re-runs across rerenders.
    expect(onSpy).toHaveBeenCalledTimes(1);

    act(() => eventBus.emit('toast', 'once'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('unsubscribes on unmount', () => {
    const { eventBus, useEventCallback } = setup();
    const spy = mock();
    const { unmount } = renderHook(() => useEventCallback('toast', spy));

    unmount();
    act(() => eventBus.emit('toast', 'x'));

    expect(spy).not.toHaveBeenCalled();
  });

  test('resubscribes when topic changes and drops the old topic', () => {
    const { eventBus, useEventCallback } = setup();
    const spy = mock();
    const { rerender } = renderHook(
      ({ topic }: { topic: 'toast' | 'count' }) => useEventCallback(topic, spy),
      { initialProps: { topic: 'toast' as 'toast' | 'count' } },
    );

    act(() => eventBus.emit('count', 1)); // not subscribed yet
    expect(spy).not.toHaveBeenCalled();

    rerender({ topic: 'count' });
    act(() => eventBus.emit('count', 2));
    expect(spy).toHaveBeenCalledWith(2);

    act(() => eventBus.emit('toast', 'old')); // old topic dropped
    expect(spy).toHaveBeenCalledTimes(1);
  });
});


describe('useSharedState', () => {
  test('seeds initial value once and exposes it', () => {
    const { eventBus, useSharedState } = setup();
    const { result } = renderHook(() => useSharedState('count', 5));

    expect(result.current[0]).toBe(5);
    expect(eventBus.state.get('count')).toBe(5);
  });

  test('initialValue seeds once; later changes to it are ignored, events take over', () => {
    const { eventBus, useSharedState } = setup();
    const { result, rerender } = renderHook(
      ({ init }: { init: number }) => useSharedState('count', init),
      { initialProps: { init: 1 } },
    );
    expect(result.current[0]).toBe(1);

    // A new initialValue on a later render does not re-seed — it is a once-per-mount seed.
    rerender({ init: 99 });
    expect(result.current[0]).toBe(1);
    expect(eventBus.state.get('count')).toBe(1);

    // After the initial seed the value is driven by events, not initialValue.
    act(() => eventBus.emit('count', 7));
    expect(result.current[0]).toBe(7);
  });

  test('setter persists to eventBus.state and updates the value', () => {
    const { eventBus, useSharedState } = setup();
    const { result } = renderHook(() => useSharedState('count', 0));

    act(() => result.current[1](42));

    expect(result.current[0]).toBe(42);
    expect(eventBus.state.get('count')).toBe(42);
  });

  test('setter keeps a stable identity across renders (like a useState setter)', () => {
    const { useSharedState } = setup();
    const { result, rerender } = renderHook(() => useSharedState('count', 0));

    const first = result.current[1];
    rerender();
    expect(result.current[1]).toBe(first);

    act(() => result.current[1](1));
    expect(result.current[1]).toBe(first);
  });

  test('reads a value set elsewhere when no initial value is given', () => {
    const { eventBus, useSharedState } = setup();
    eventBus.state.set('count', 9); // e.g. set by useSharedStateInitializer higher up

    const { result } = renderHook(() => useSharedState('count'));

    expect(result.current[0]).toBe(9);
  });

  test('providing an initial value overwrites an existing one (acts as initializer + read)', () => {
    const { eventBus, useSharedState } = setup();
    eventBus.state.set('count', 7);

    const { result } = renderHook(() => useSharedState('count', 3));

    expect(result.current[0]).toBe(3);
    expect(eventBus.state.get('count')).toBe(3);
  });

  test('throws when no initial value is given and the topic is uninitialised', () => {
    const { useSharedState } = setup();

    expect(() => renderHook(() => useSharedState('count'))).toThrow(/has no value/);
  });

  test('a page-level initial value is readable by a deep descendant with no initial (no prop-drilling)', () => {
    const { useSharedState } = setup();

    const Leaf = () => {
      const [count] = useSharedState('count');
      return <span>leaf:{count}</span>;
    };
    const Middle = () => <div><Leaf /></div>;
    // Page-level owner seeds the value via `useSharedState(topic, initial)`. The
    // seed happens during this render (the useState initializer), before the
    // descendants render — so the leaf never hits the "has no value" throw.
    const Page = () => {
      const [count] = useSharedState('count', 5);
      return <div>page:{count}<Middle /></div>;
    };

    const screen = render(<Page />);
    expect(screen.getByText('page:5')).toBeDefined();
    expect(screen.getByText('leaf:5')).toBeDefined();
  });

  test('throws if the topic changes between renders (bound to one topic for its lifetime)', () => {
    const { eventBus, useSharedState } = setup();
    eventBus.state.set('count', 0);
    eventBus.state.set('total', 0);

    const { rerender } = renderHook(
      ({ topic }: { topic: 'count' | 'total' }) => useSharedState(topic),
      { initialProps: { topic: 'count' as 'count' | 'total' } },
    );

    expect(() => rerender({ topic: 'total' })).toThrow(/topic changed/);
  });

  test('does not re-seed eventBus.state after an external reset (latched once per instance)', () => {
    const { eventBus, useSharedState } = setup();
    const { rerender } = renderHook(() => useSharedState('count', 0));
    expect(eventBus.state.get('count')).toBe(0);

    // Cleared elsewhere; an unrelated re-render must not resurrect the seed.
    eventBus.state.reset('count');
    rerender();

    expect(eventBus.state.has('count')).toBe(false);
  });

  test('setValue emits so other subscribers of the topic are notified', () => {
    const { eventBus, useSharedState } = setup();
    const external = mock();
    eventBus.on('count', external);

    const { result } = renderHook(() => useSharedState('count', 0));
    act(() => result.current[1](42));

    expect(external).toHaveBeenCalledWith(42);
    expect(eventBus.state.get('count')).toBe(42);
  });
});


describe('useSharedStateInitializer', () => {
  test('seeds the topic on mount', () => {
    const { eventBus, useSharedStateInitializer } = setup();

    renderHook(() => useSharedStateInitializer('count', 3));

    expect(eventBus.state.get('count')).toBe(3);
  });

  test('does not re-seed after the value is cleared during the same mount', () => {
    const { eventBus, useSharedStateInitializer } = setup();

    const { rerender } = renderHook(() => useSharedStateInitializer('count', 3));
    expect(eventBus.state.get('count')).toBe(3);

    // Something else clears the topic; an unrelated re-render must not resurrect it.
    eventBus.state.reset('count');
    rerender();

    expect(eventBus.state.has('count')).toBe(false);
  });

  test('seeds the new topic when topic changes', () => {
    const { eventBus, useSharedStateInitializer } = setup();

    const { rerender } = renderHook(
      ({ topic, value }: { topic: 'count' | 'total'; value: number }) =>
        useSharedStateInitializer(topic, value),
      { initialProps: { topic: 'count' as 'count' | 'total', value: 3 } },
    );
    expect(eventBus.state.get('count')).toBe(3);

    rerender({ topic: 'total', value: 9 });
    expect(eventBus.state.get('total')).toBe(9);
  });

  // Caveat of the effect-based seed: it runs AFTER descendants render, so a child
  // reading the topic with no initial throws on first mount. The render-time seed of
  // `useSharedState(topic, initial)` is the mitigation (see the prop-drilling test).
  test('a child reading before the parent effect runs throws (effect-seed ordering)', () => {
    const { useSharedState, useSharedStateInitializer } = setup();

    const Child = () => {
      const [count] = useSharedState('count');
      return <span>{count}</span>;
    };
    const Parent = () => {
      useSharedStateInitializer('count', 4);
      return <Child />;
    };

    expect(() => render(<Parent />)).toThrow(/has no value/);
  });
});


describe('StrictMode (dev double-invoke)', () => {
  test('useEventCallback fires once per emit despite the double mount', () => {
    const { eventBus, useEventCallback } = setup();
    const spy = mock();
    renderHook(() => useEventCallback('toast', spy), { wrapper: StrictMode });

    act(() => eventBus.emit('toast', 'x'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('useEvent reflects the latest payload exactly once', () => {
    const { eventBus, useEvent } = setup();

    // Track net-active subscriptions for the topic: each `on` adds one, each call
    // to the unsubscribe it returns removes one. StrictMode's double-invoke must
    // net out to a single live subscription.
    let active = 0;
    const realOn = eventBus.on.bind(eventBus);
    spyOn(eventBus, 'on').mockImplementation((topic, callback) => {
      const unsubscribe = realOn(topic as 'toast', callback as never);
      active += 1;
      return () => {
        active -= 1;
        unsubscribe();
      };
    });

    const { result } = renderHook(() => useEvent('toast'), { wrapper: StrictMode });

    expect(active).toBe(1);

    act(() => eventBus.emit('toast', 'hi'));

    expect(result.current).toBe('hi');
  });

  test('useSharedState seeds and reads under StrictMode without throwing', () => {
    const { useSharedState } = setup();
    const { result } = renderHook(() => useSharedState('count', 5), { wrapper: StrictMode });

    expect(result.current[0]).toBe(5);
  });
});
