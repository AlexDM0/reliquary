import { defineConfig } from 'tsdown';

export default defineConfig({
  entry:     ['src/index.ts'],
  format:    ['esm', 'cjs'],
  dts:       true,
  clean:     true,
  sourcemap: true,
  // Peer deps must never be bundled. `@reliquary/event-bus` is used for types only
  // at runtime, but keep it external regardless so consumers get one instance.
  external:  ['react', 'react-dom', '@reliquary/event-bus'],
});
