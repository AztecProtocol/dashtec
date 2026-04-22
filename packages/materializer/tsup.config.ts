import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  // Bundle indexer-ponder since it exports raw .ts files (not compiled dist/)
  noExternal: ['@dashtec/indexer-ponder'],
});
