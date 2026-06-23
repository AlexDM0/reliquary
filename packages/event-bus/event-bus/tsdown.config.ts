import { defineConfig } from 'tsdown';

export default defineConfig({
  entry:     ['src/index.ts'],
  format:    ['esm', 'cjs'],
  dts:       true,
  clean:     true,
  sourcemap: true,
  // No runtime dependencies — nothing to mark external.
});
