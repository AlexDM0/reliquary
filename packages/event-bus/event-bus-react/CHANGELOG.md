# @reliquary/event-bus-react

## 1.0.0

### Major Changes

- First stable release. Promotes the event-bus core and its React hooks to 1.0.0, locking in the public API and the `^1.0.0` peer range between them.

### Patch Changes

- Updated dependencies
  - @reliquary/event-bus@1.0.0

## 0.3.0

### Minor Changes

- 7f2c1ea: Publish under the `@reliquary` npm scope.

### Patch Changes

- Updated dependencies [7f2c1ea]
  - @reliquary/event-bus@0.3.0

## 0.2.0

### Minor Changes

- 241415b: Initial release of the React 18/19 hooks. `createEventBusHooks(eventBus)` returns
  `useEvent`, `useEventCallback`, `useSharedState` (non-null, optional initial value),
  and `useSharedStateInitializer`, all bound to your typed bus instance. `@reliquary/event-bus`
  and `react` are peer dependencies.

### Patch Changes

- Updated dependencies [241415b]
  - @reliquary/event-bus@0.2.0
