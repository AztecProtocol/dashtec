import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    clean: true,
    dts: true,
    // Don't bundle workspace deps - let node_modules handle resolution
});
