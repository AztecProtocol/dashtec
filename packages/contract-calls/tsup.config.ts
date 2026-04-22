import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/**/*.ts',
  ],
  format: ['esm'],
  dts: true,
  splitting: false,
  treeshake: true,
  external: ['@dashtec/shared-types', '@dashtec/shared-utils', 'viem']
});
