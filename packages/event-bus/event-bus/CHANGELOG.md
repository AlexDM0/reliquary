# @reliquary/event-bus

## 0.3.0

### Minor Changes

- 7f2c1ea: Publish under the `@reliquary` npm scope.

## 0.2.0

### Minor Changes

- 241415b: Initial release of the pure-TS core. A type-safe `EventBus` (`on` / `emit` / `reset`)
  created via the `createEventBus` factory, with a swappable shared-state store under
  `EventBus.state` (`get` / `set` / `has` / `reset`) backed by an injectable
  `SharedStateManager` (default `InMemorySharedStateManager`). Ships ESM + CJS with
  bundled type declarations.
